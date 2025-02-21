import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { getCurrencySymbol } from "@/utils/helpers";
import {CountryExpensesDisplay} from "@/components/stats/CountryExpensesDisplay.tsx";

interface CountryExpense {
    country: string;
    flag: string;
    totalSpent: number;
    totalBudget: number;
    days: number;
}

interface CountryExpensesChartProps {
    data: CountryExpense[];
    currency: string;
}

export const CountryExpensesChart: React.FC<CountryExpensesChartProps> = ({ data, currency }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!data || data.length === 0) return;

        // Increase margins to allow space for country labels and flags.
        const margin = { top: 10, right: 0, bottom: 10, left: 40 };
        const width = 300;
        const height = data.length * 50 + margin.top + margin.bottom;

        const svg = d3
            .select(svgRef.current)
            .attr("width", width)
            .attr("height", height)
            .style("overflow", "visible");

        // Clear previous renders
        svg.selectAll("*").remove();

        // Determine maximum value from both budget and expenses
        const maxValue = d3.max(data, (d) => Math.max(d.totalBudget, d.totalSpent)) || 1;

        // xScale for bars – note that it now takes into account the left margin
        const xScale = d3
            .scaleLinear()
            .domain([0, maxValue * 1.1])
            .range([0, width - margin.right - margin.left]);

        // yScale for positioning rows
        const yScale = d3
            .scaleBand()
            .domain(data.map((d) => d.country))
            .range([0, height - margin.top - margin.bottom])
            .padding(0.3);

        // Group for the chart (bars and expense labels)
        const chartGroup = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // Draw background budget bars
        chartGroup.selectAll(".budget-bar")
            .data(data)
            .join("rect")
            .attr("class", "budget-bar")
            .attr("x", 0)
            .attr("y", (d) => yScale(d.country)!)
            .attr("width", (d) => xScale(d.totalBudget))
            .attr("height", yScale.bandwidth())
            .attr("fill", "#29d440");

        // Draw foreground expense bars
        chartGroup.selectAll(".expense-bar")
            .data(data)
            .join("rect")
            .attr("class", "expense-bar")
            .attr("x", 0)
            .attr("y", (d) => yScale(d.country)!)
            .attr("width", (d) => xScale(d.totalSpent))
            .attr("height", yScale.bandwidth())
            .attr("fill", "#f59e0b");

        // Add text labels at the end of expense bars
        chartGroup.selectAll(".label")
            .data(data)
            .join("text")
            .attr("x", (d) => xScale(d.totalSpent) + 5)
            .attr("y", (d) => yScale(d.country)! + yScale.bandwidth() / 2)
            .attr("dy", ".35em")
            .text((d) => `${d.totalSpent.toFixed(2)} ${getCurrencySymbol(currency)}`)
            .style("font-size", "12px")
            .style("fill", "#374151");

        // Create a separate group for the country labels (flags + name + days)
        const labelGroup = svg.append("g")
            .attr("transform", `translate(${margin.left - 10}, ${margin.top})`);

        const countryRows = labelGroup.selectAll(".country-row")
            .data(data)
            .join("g")
            .attr("class", "country-row")
            .attr("transform", (d) => `translate(0, ${yScale(d.country)! + yScale.bandwidth() / 2})`);

        // Append the flag image for each country
        countryRows.append("image")
            .attr("xlink:href", (d) => d.flag)
            .attr("width", 24)
            .attr("height", 16)
            .attr("x", -30)
            .attr("y", -8);


    }, [data, currency]);

    return <div>
        <div className="flex justify-end gap-2">
            <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-green-500"></div>
                <span>Budget</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-yellow-500"></div>
                <span>Spent</span>
            </div>
        </div>
        <svg ref={svgRef}/>
        <CountryExpensesDisplay data={data} currency={currency} svgRef={svgRef}/>
    </div>;
};
