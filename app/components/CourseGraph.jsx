"use client";

import * as d3 from "d3";
import { useEffect, useRef } from "react";

export default function CourseGraph({ data }) {
    const svgRef = useRef();

    useEffect(() => {
        if (!data) return;

        const width = 1200;
        const height = 800;

        d3.select(svgRef.current).selectAll("*").remove();

        const nodes = data.nodes.map(d => ({ ...d }));
        const links = data.links.map(d => ({ ...d }));

        // -------------------------
        // Compute topological levels
        // -------------------------
        const adjacency = {};
        nodes.forEach(n => (adjacency[n.id] = []));
        links.forEach(l => {
            const src = l.source;
            const tgt = l.target;
            if (!adjacency[src]) adjacency[src] = [];
            adjacency[src].push(tgt);
        });

        const levels = {};
        function computeLevel(nodeId) {
            if (levels[nodeId] !== undefined) return levels[nodeId];
            const children = adjacency[nodeId] || [];
            if (children.length === 0) return (levels[nodeId] = 0);
            const maxChild = Math.max(...children.map(computeLevel));
            return (levels[nodeId] = maxChild + 1);
        }

        nodes.forEach(n => computeLevel(n.id));
        nodes.forEach(n => (n.level = levels[n.id]));

        // Set initial positions
        nodes.forEach(n => {
            n.x = width / 2;
            n.y = n.level * 120 + 50;
            n.initialX = n.x;
            n.initialY = n.y;
        });

        const svg = d3
            .select(svgRef.current)
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .style("max-width", "100%")
            .style("height", "auto")
            .style("font-family", "sans-serif");

        // Force simulation
        const simulation = d3
            .forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(150))
            .force("charge", d3.forceManyBody().strength(-500))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("x", d3.forceX(width / 2))
            .force("y", d3.forceY(d => d.level * 120 + 50))
            .on("tick", ticked);

        // Links
        const link = svg
            .append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke-width", 2);

        // Nodes as <g>
        const node = svg
            .selectAll("g.node")
            .data(nodes)
            .join("g")
            .attr("class", "node")
            .call(drag(simulation));

        node.append("circle")
            .attr("r", 25)
            .attr("fill", "#3498db");

        node.append("text")
            .text(d => d.id)
            .attr("text-anchor", "middle")
            .attr("y", -30)
            .attr("fill", "#fff")
            .attr("font-size", "12px");

        function ticked() {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("transform", d => `translate(${d.x},${d.y})`);
        }

        function drag(simulation) {
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

            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }

        // Reset function
        window.resetGraph = () => {
            nodes.forEach(d => {
                d.fx = d.initialX;
                d.fy = d.initialY;
            });
            simulation.alpha(1).restart();
            setTimeout(() => {
                nodes.forEach(d => {
                    d.fx = null;
                    d.fy = null;
                });
            });
        };

        return () => simulation.stop();
    }, [data]);

    return <svg ref={svgRef}></svg>;
}
