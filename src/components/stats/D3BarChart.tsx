import { useEffect, useRef } from "react";
import * as d3 from "d3";

export function D3BarChart({ data, width = 300, height = 250 }) {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!data || data.length === 0) return;

        const margin = { top: 20, right: 10, bottom: 10, left: 10 }; // Reduce left margin
        const barPadding = 0.4; // Makes bars thinner

        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height)
            .style("overflow", "visible");

        // Create scales
        const xScale = d3.scaleBand()
            .domain(data.map(d => d.month))
            .range([margin.left, width - margin.right])
            .padding(barPadding); // Adjusts bar thickness

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.amount) || 1])
            .range([height - margin.bottom, margin.top]);

        // Remove previous elements
        svg.selectAll("*").remove();

        // Add X-axis (Month names)
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(xScale).tickSize(0)) // Removes tick lines
            .selectAll("text")
            .attr("text-anchor", "middle")
            .style("font-size", "12px");

        // Remove Y-axis (No numbers)
        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale).tickFormat("").tickSize(0)) // Hide numbers
            .style("display", "none"); // Hide entire Y-axis

        // Draw bars
        svg.selectAll(".bar")
            .data(data)
            .join("rect")
            .attr("class", "bar")
            .attr("x", d => xScale(d.month))
            .attr("y", d => yScale(d.amount))
            .attr("width", xScale.bandwidth()) // Thinner bars
            .attr("height", d => height - margin.bottom - yScale(d.amount))
            .attr("fill", "#FFA500"); // Orange color
    }, [data]);

    return <svg ref={svgRef} />;
}
