"use client";

import * as d3 from "d3";
import { useEffect, useRef } from "react";

export default function CourseGraph({ data }) {
    const svgRef = useRef();

    useEffect(() => {
        if (!data || !data.nodes || data.nodes.length === 0) return;

        const width = 1200;
        const height = 800;

        d3.select(svgRef.current).selectAll("*").remove();

        // Create hierarchy structure
        const nodes = data.nodes.map(d => ({ ...d }));
        const links = data.links.map(d => ({ ...d }));

        // Filter out invalid links
        const nodeIds = new Set(nodes.map(n => n.id));
        const validLinks = links.filter(l => {
            const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
            const targetId = typeof l.target === 'object' ? l.target.id : l.target;
            return nodeIds.has(sourceId) && nodeIds.has(targetId);
        });

        // Build adjacency list (reversed - from target to sources/prerequisites)
        const childrenMap = new Map();
        nodes.forEach(n => childrenMap.set(n.id, []));

        validLinks.forEach(link => {
            const source = typeof link.source === 'object' ? link.source.id : link.source;
            const target = typeof link.target === 'object' ? link.target.id : link.target;
            if (!childrenMap.has(target)) childrenMap.set(target, []);
            childrenMap.get(target).push(source);
        });

        // Find root (course with no incoming edges - the one being searched)
        const hasParent = new Set();
        validLinks.forEach(link => {
            const source = typeof link.source === 'object' ? link.source.id : link.source;
            hasParent.add(source);
        });

        const roots = nodes.filter(n => !hasParent.has(n.id));
        const root = roots.length > 0 ? roots[0] : nodes[0];

        // Build tree structure - FIXED: Allow nodes to appear multiple times
        function buildTree(nodeId, ancestorPath = new Set()) {
            // Only prevent infinite loops by checking the current path
            if (ancestorPath.has(nodeId)) return null;

            const node = nodes.find(n => n.id === nodeId);
            if (!node) return null;

            // Add to current path to detect cycles
            const newPath = new Set(ancestorPath);
            newPath.add(nodeId);

            const children = (childrenMap.get(nodeId) || [])
                .map(childId => buildTree(childId, newPath))
                .filter(child => child !== null);

            return {
                name: node.id,
                title: node.title,
                children: children.length > 0 ? children : undefined
            };
        }

        const treeData = buildTree(root.id);
        if (!treeData) return;

        // Create tree layout
        const treeLayout = d3.tree()
            .size([width - 100, height - 150])
            .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));

        const rootNode = d3.hierarchy(treeData);
        treeLayout(rootNode);

        const svg = d3
            .select(svgRef.current)
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .style("max-width", "100%")
            .style("height", "auto");

        const g = svg.append("g")
            .attr("transform", `translate(50, 50)`);

        // Draw links
        g.selectAll(".link")
            .data(rootNode.links())
            .join("path")
            .attr("class", "link")
            .attr("d", d3.linkVertical()
                .x(d => d.x)
                .y(d => d.y))
            .attr("fill", "none")
            .attr("stroke", "#999")
            .attr("stroke-width", 2)
            .attr("stroke-opacity", 0.6);

        // Draw nodes
        const node = g.selectAll(".node")
            .data(rootNode.descendants())
            .join("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.x},${d.y})`);

        // Add circles
        node.append("circle")
            .attr("r", d => d.depth === 0 ? 35 : 25)
            .attr("fill", d => d.depth === 0 ? "#e74c3c" : "#3498db")
            .attr("stroke", "#fff")
            .attr("stroke-width", 3);

        // Add course code text
        node.append("text")
            .text(d => d.data.name)
            .attr("dy", "-2.2em")
            .attr("text-anchor", "middle")
            .attr("font-size", d => d.depth === 0 ? "14px" : "12px")
            .attr("font-weight", "bold")
            .attr("fill", "#333");

        // Add drag behavior
        const drag = d3.drag()
            .on("start", function (event, d) {
                d3.select(this).raise().attr("stroke", "black");
            })
            .on("drag", function (event, d) {
                d.x = event.x;
                d.y = event.y;
                d3.select(this).attr("transform", `translate(${d.x},${d.y})`);

                // Update links
                g.selectAll(".link")
                    .attr("d", d3.linkVertical()
                        .x(d => d.x)
                        .y(d => d.y));
            })
            .on("end", function (event, d) {
                d3.select(this).attr("stroke", null);
            });

        node.call(drag);

        // Reset function
        window.resetGraph = () => {
            treeLayout(rootNode);

            node.transition()
                .duration(750)
                .attr("transform", d => `translate(${d.x},${d.y})`);

            g.selectAll(".link")
                .transition()
                .duration(750)
                .attr("d", d3.linkVertical()
                    .x(d => d.x)
                    .y(d => d.y));
        };

    }, [data]);

    return <svg ref={svgRef}></svg>;
}