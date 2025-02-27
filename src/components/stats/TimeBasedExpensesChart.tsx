import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { getCurrencySymbol } from "@/utils/helpers";

export interface TimeEntry {
    label: string;
    amount: number;
    year?: string;
    month?: string;
    week?: string;
    day?: string;
}

interface TimeBasedExpensesChartProps {
    data: TimeEntry[];
    width?: number;
    height?: number;
    currency: string;
    timeUnit: string;
}

export function TimeBasedExpensesChart({
                                           data,
                                           width = 300,
                                           height = 250,
                                           currency,
                                           timeUnit
                                       }: TimeBasedExpensesChartProps) {
    const svgRef = useRef(null);
    const currencySymbol = getCurrencySymbol(currency);

    const topRoundedRect = (x, y, width, height, radius) => {
        return `
            M${x + radius},${y}
            h${width - 2 * radius}
            a${radius},${radius} 0 0 1 ${radius},${radius}
            v${height - radius}
            h${-width}
            v${-(height - radius)}
            a${radius},${radius} 0 0 1 ${radius},-${radius}
            z
          `;
    }

    useEffect(() => {
        if (!data || data.length === 0) return;

        const margin = { top: 10, right: 10, bottom: 10, left: 10 };
        const barPadding = 0.4;

        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height)
            .style("overflow", "visible");

        // Create scales
        const xScale = d3.scaleBand()
            .domain(data.map(d => d.label))
            .range([margin.left, width - margin.right])
            .padding(barPadding);

        const yMax = d3.max(data, d => d.amount) || 1;
        const yScale = d3.scaleLinear()
            .domain([0, yMax * 1.1]) // Add 10% padding at top
            .range([height - margin.bottom, margin.top]);

        // Remove previous elements
        svg.selectAll("*").remove();

        // Add X-axis (Time labels)
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(xScale).tickSize(0)) // Removes tick lines
            .selectAll("text")
            .attr("text-anchor", "middle")
            .style("font-size", "12px");

        // Draw bars
        svg.selectAll(".bar")
            .data(data)
            .join("path")
            .attr("class", "bar")
            .attr("d", d => topRoundedRect(
                xScale(d.label),
                yScale(d.amount),
                xScale.bandwidth(),
                height - margin.bottom - yScale(d.amount),
                8
            ))
            .attr("fill", "#FFA500")
            .on("mouseover", function(event, d) {
                d3.select(this).attr("fill", "#2563EB");

                // Show tooltip
                const tooltipText = svg.append("text")
                    .attr("class", "tooltip")
                    .attr("x", xScale(d.label) + xScale.bandwidth() / 2)
                    .attr("y", yScale(d.amount) - 20)
                    .attr("text-anchor", "middle")
                    .style("font-size", "12px")
                    .style("font-weight", "bold");

                tooltipText.append("tspan")
                    .attr("x", xScale(d.label) + xScale.bandwidth() / 2) // reset x for each line
                    .attr("dy", "0em") // relative offset
                    .text(d.label);

                tooltipText.append("tspan")
                    .attr("x", xScale(d.label) + xScale.bandwidth() / 2)
                    .attr("dy", "1.2em") // move line downward
                    .text(`${d.amount.toFixed(2)}${currencySymbol}`);
            })
            .on("mouseout", function() {
                d3.select(this).attr("fill", "#FFA500");
                svg.selectAll(".tooltip").remove();
            });

        // Add title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text(`${timeUnit} Expenses`);

    }, [data, width, height, currencySymbol, timeUnit]);

    return <svg ref={svgRef} />;
}
