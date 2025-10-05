"use client";

import * as d3 from "d3";
import { useEffect, useRef } from "react";

export default function CourseGraph({ data }) {
    const svgRef = useRef();

    useEffect(() => {
        if (!svgRef.current) return;

        if (!data || !data.nodes || data.nodes.length === 0) {
            d3.select(svgRef.current).selectAll("*").remove();
            return;
        }

        const container = svgRef.current.parentElement;
        const bounds = container?.getBoundingClientRect();
        const width = bounds?.width || window.innerWidth || 1200;
        const height = bounds?.height || window.innerHeight || 800;

        d3.select(svgRef.current).selectAll("*").remove();

        // Use the data directly - no tree conversion needed!
        const nodes = data.nodes.map(d => ({ ...d }));
        const links = data.links.map(d => ({ ...d }));

        // Filter out invalid links
        const nodeIds = new Set(nodes.map(n => n.id));
        const validLinks = links.filter(l => {
            const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
            const targetId = typeof l.target === 'object' ? l.target.id : l.target;
            return nodeIds.has(sourceId) && nodeIds.has(targetId);
        });

        // Find the root node (the course being searched - has no incoming edges)
        const hasIncoming = new Set();
        validLinks.forEach(link => {
            const source = typeof link.source === 'object' ? link.source.id : link.source;
            hasIncoming.add(source);
        });
        const rootNode = nodes.find(n => !hasIncoming.has(n.id)) || nodes[0];

        // Calculate depth for each node (BFS from root)
        const depths = new Map();
        const queue = [{ id: rootNode.id, depth: 0 }];
        const visited = new Set();

        depths.set(rootNode.id, 0);

        while (queue.length > 0) {
            const { id, depth } = queue.shift();
            if (visited.has(id)) continue;
            visited.add(id);

            // Find all prerequisites (nodes this course points to)
            validLinks.forEach(link => {
                const target = typeof link.target === 'object' ? link.target.id : link.target;
                const source = typeof link.source === 'object' ? link.source.id : link.source;

                if (target === id && !visited.has(source)) {
                    const existingDepth = depths.get(source);
                    const newDepth = depth + 1;

                    if (existingDepth === undefined || newDepth < existingDepth) {
                        depths.set(source, newDepth);
                    }

                    queue.push({ id: source, depth: newDepth });
                }
            });
        }

        // Assign depth to all nodes
        nodes.forEach(node => {
            node.depth = depths.get(node.id) || 0;
        });

        // Group nodes by depth for horizontal spacing
        const nodesByDepth = new Map();
        nodes.forEach(node => {
            if (!nodesByDepth.has(node.depth)) {
                nodesByDepth.set(node.depth, []);
            }
            nodesByDepth.get(node.depth).push(node);
        });

        // Calculate initial positions
        const maxDepth = Math.max(...depths.values());
        const verticalSpacing = (height - 150) / (maxDepth || 1);

        nodesByDepth.forEach((nodesAtDepth, depth) => {
            const horizontalSpacing = width / (nodesAtDepth.length + 1);
            nodesAtDepth.forEach((node, i) => {
                node.x = horizontalSpacing * (i + 1);
                node.y = 75 + depth * verticalSpacing;
            });
        });

        // Identify OR relationships (multiple nodes pointing to same target)
        const linksByTarget = new Map();
        validLinks.forEach(link => {
            const source = typeof link.source === 'object' ? link.source.id : link.source;
            const target = typeof link.target === 'object' ? link.target.id : link.target;
            if (!linksByTarget.has(target)) linksByTarget.set(target, []);
            linksByTarget.get(target).push(source);
        });

        const svg = d3
            .select(svgRef.current)
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "100%")
            .style("display", "block");

        const g = svg.append("g");

        const zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        svg.call(zoom);

        const topMargin = 120;
        const sidePadding = 56;
        const bottomPadding = 48;

        const fitGraphToView = (duration = 750) => {
            const graphBounds = g.node()?.getBBox();
            if (!graphBounds || !isFinite(graphBounds.width) || !isFinite(graphBounds.height)) {
                return;
            }

            const graphWidth = Math.max(graphBounds.width, 1);
            const graphHeight = Math.max(graphBounds.height, 1);

            const availableWidth = Math.max(width - sidePadding * 2, 1);
            const availableHeight = Math.max(height - topMargin - bottomPadding, 1);

            const rawScale = Math.min(availableWidth / graphWidth, availableHeight / graphHeight, 2.5);
            const scale = Math.min(Math.max(rawScale, 0.1), 3);

            const graphCenterX = graphBounds.x + graphWidth / 2;
            const graphCenterY = graphBounds.y + graphHeight / 2;

            const targetCenterX = width / 2;
            const targetCenterY = topMargin + availableHeight / 2;

            const translateX = targetCenterX - scale * graphCenterX;
            const translateY = targetCenterY - scale * graphCenterY;

            const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);

            svg.transition().duration(duration).call(zoom.transform, transform);
        };

        let hasInitialFit = false;

        // Create force simulation with strong positioning forces
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(validLinks)
                .id(d => d.id)
                .distance(100)
                .strength(0.5))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("collision", d3.forceCollide().radius(40))
            // Strong vertical force to maintain depth levels
            .force("y", d3.forceY()
                .y(d => 75 + d.depth * verticalSpacing)
                .strength(1.2))
            // Moderate horizontal force to prevent overlap
            .force("x", d3.forceX()
                .x(d => {
                    const nodesAtDepth = nodesByDepth.get(d.depth);
                    const index = nodesAtDepth.indexOf(d);
                    const horizontalSpacing = width / (nodesAtDepth.length + 1);
                    return horizontalSpacing * (index + 1);
                })
                .strength(0.3));

        // Add arrow markers for directed edges
        svg.append("defs").selectAll("marker")
            .data(["arrow"])
            .join("marker")
            .attr("id", "arrow")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 35)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#999");

        // Draw links
        const link = g.append("g")
            .selectAll("path")
            .data(validLinks)
            .join("path")
            .attr("class", "link")
            .attr("fill", "none")
            .attr("stroke", "#999")
            .attr("stroke-width", 2)
            .attr("stroke-opacity", 0.6)
            .attr("marker-end", "url(#arrow)");



        // Draw nodes
        const node = g.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr("class", "node")
            .on("mouseenter", function (event, d) {
                // Find all connected nodes
                const connectedNodeIds = new Set();
                connectedNodeIds.add(d.id);

                validLinks.forEach(link => {
                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;

                    if (sourceId === d.id) connectedNodeIds.add(targetId);
                    if (targetId === d.id) connectedNodeIds.add(sourceId);
                });

                // Dim all nodes and links
                node.style("opacity", n => connectedNodeIds.has(n.id) ? 1 : 0.2);
                link.style("opacity", l => {
                    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
                    const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                    return (sourceId === d.id || targetId === d.id) ? 1 : 0.1;
                });

                // Highlight connected links
                link.attr("stroke", l => {
                    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
                    const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                    return (sourceId === d.id || targetId === d.id) ? "#e74c3c" : "#999";
                })
                    .attr("stroke-width", l => {
                        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
                        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                        return (sourceId === d.id || targetId === d.id) ? 3 : 2;
                    });
            })
            .on("mouseleave", function () {
                // Reset all styles
                node.style("opacity", 1);
                link.style("opacity", 0.6)
                    .attr("stroke", "#999")
                    .attr("stroke-width", 2);
            })
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        // Add circles
        node.append("circle")
            .attr("r", d => d.id === rootNode.id ? 35 : 25)
            .attr("fill", d => d.id === rootNode.id ? "#e74c3c" : "#3498db")
            .attr("stroke", "#fff")
            .attr("stroke-width", 3);

        // Add course code text
        node.append("text")
            .text(d => d.id)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .attr("font-size", d => d.id === rootNode.id ? "16px" : "14px")
            .attr("font-weight", "700")
            .attr("letter-spacing", "0.04em")
            .attr("fill", "#F9FAFB")
            .attr("paint-order", "stroke")
            .attr("stroke", "rgba(15, 23, 42, 0.6)")
            .attr("stroke-width", 3)
            .attr("pointer-events", "none");

        // Update positions on simulation tick
        simulation.on("tick", () => {
            link.attr("d", d => {
                return `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`;
            });

            node.attr("transform", d => `translate(${d.x},${d.y})`);

            if (!hasInitialFit) {
                hasInitialFit = true;
                fitGraphToView(600);
            }
        });

        simulation.on("end", () => {
            fitGraphToView();
        });

        // Drag functions
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        // Reset function
        window.resetGraph = () => {
            // Reset fixed positions
            nodes.forEach(node => {
                node.fx = null;
                node.fy = null;
            });

            hasInitialFit = false;
            simulation.alpha(1).restart();
            fitGraphToView(600);
        };

        // Cleanup
        return () => {
            simulation.stop();
            if (window.resetGraph) {
                window.resetGraph = undefined;
            }
        };

    }, [data]);

    return <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />;
}
