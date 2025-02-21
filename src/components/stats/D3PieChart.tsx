import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

/**
 * Props for the D3PieChart component.
 * - `data`: an array of objects with { name, amount, color? }.
 * - `width`: optional width of the SVG container.
 * - `height`: optional height of the SVG container.
 */
interface D3PieChartProps {
    data: {
        name: string;
        amount: number;
        color?: string;
    }[];
    width?: number;
    height?: number;
    currency?: string;
}

export const D3PieChart: React.FC<D3PieChartProps> = ({
                                                          data,
                                                          width = 300,
                                                          height = 300,
                                                          currency = '€',
                                                      }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [tooltip, setTooltip] = useState<{
        visible: boolean;
        x: number;
        y: number;
        name: string;
        amount: number | string;
    }>({
        visible: false,
        x: 0,
        y: 0,
        name: "",
        amount: 0,
    });

    useEffect(() => {
        if (!data || data.length === 0) return;
        if (!svgRef.current) return;

        // Clear any existing chart before re-drawing
        d3.select(svgRef.current).selectAll("*").remove();

        // Chart dimensions
        const margin = 10;
        const radius = Math.min(width, height) / 2 - margin;

        // Create root SVG
        const svg = d3
            .select(svgRef.current)
            .attr("width", width)
            .attr("height", height);

        // Create chart group and center it
        const g = svg
            .append("g")
            .attr("transform", `translate(${width / 2}, ${height / 2})`);

        // Create color scale if needed for categories without a custom color
        const color = d3
            .scaleOrdinal<string>()
            .range(d3.schemeSet2); // or any palette you prefer

        // Create the pie layout
        const pie = d3
            .pie<{ name: string; amount: number; color?: string }>()
            .value((d) => d.amount)
            .sort(null);

        // Create arc generator
        const arcGenerator = d3
            .arc<d3.PieArcDatum<{ name: string; amount: number; color?: string }>>()
            .innerRadius(0)
            .outerRadius(radius);

        // Compute pie slices
        const arcs = pie(data);

        // Draw slices
        g.selectAll("path")
            .data(arcs)
            .enter()
            .append("path")
            .attr("d", arcGenerator as any)
            .attr("fill", (d, i) =>
                d.data.color ? d.data.color : color(String(i)) // fallback to color scale
            )
            .attr("stroke", "#fff")
            .style("stroke-width", "2px")
            .on("mouseover", (event, d) => {
                // Mouse position relative to the page
                const [mouseX, mouseY] = d3.pointer(event);

                setTooltip({
                    visible: true,
                    x: mouseX + width / 2,
                    y: mouseY + height / 2,
                    name: d.data.name,
                    amount: `${d.data.amount.toFixed(2)}${currency}`,
                });
            })
            .on("mousemove", (event) => {
                const [mouseX, mouseY] = d3.pointer(event);
                setTooltip((prev) => ({
                    ...prev,
                    x: mouseX + width / 2,
                    y: mouseY + height / 2,
                }));
            })
            .on("mouseout", () => {
                setTooltip((prev) => ({ ...prev, visible: false }));
            });

        // Add labels inside the slices (ensuring they are visible)
        g.selectAll("text")
            .data(arcs)
            .enter()
            .append("text")
            .attr("transform", (d) => {
                const [x, y] = arcGenerator.centroid(d);
                return `translate(${x}, ${y})`;
            })
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .text((d) => {
                const total = d3.sum(data, (d) => d.amount);
                const percentage = ((d.data.amount / total) * 100).toFixed(1);
                return `${percentage}%`; // Show percentage
            })
            .style("font-size", "0.8rem")
            .style("fill", "#fff")
            .style("font-weight", "bold");

    }, [data, width, height]);

    return (
        <div className="relative w-full flex flex-col items-center justify-center">
            <svg ref={svgRef} />

            {tooltip.visible && (
                <div
                    className="absolute bg-white border rounded px-2 py-1 shadow text-sm"
                    style={{
                        top: tooltip.y,
                        left: tooltip.x,
                        pointerEvents: "none", // ignore mouse in tooltip
                        transform: "translate(-50%, -100%)", // shift above mouse
                    }}
                >
                    <div className="font-semibold">{tooltip.name}</div>
                    <div>Amount: {tooltip.amount}</div>
                </div>
            )}

            {/*<div className="mt-4 flex flex-wrap justify-center gap-3">*/}
            {/*    {data.map((item) => (*/}
            {/*        <div key={item.name} className="flex items-center space-x-2">*/}
            {/*            <div*/}
            {/*                className="w-4 h-4 rounded-full"*/}
            {/*                style={{ backgroundColor: item.color }}*/}
            {/*            ></div>*/}
            {/*            <span className="text-sm font-medium">{item.name}</span>*/}
            {/*        </div>*/}
            {/*    ))}*/}
            {/*</div>*/}
        </div>
    );
};
