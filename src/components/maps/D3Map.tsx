import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface Expense {
    latitude: number;
    longitude: number;
    amount: number;
    name: string;
    currency?: string;
    country?: string;
}

interface D3MapProps {
    expenses: Expense[];
    width?: number;
    height?: number;
}

export const D3Map: React.FC<D3MapProps> = ({
                                                expenses,
                                                width = 300,
                                                height = 500,
                                            }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [geoJSON, setGeoJSON] = useState<any | null>(null);
    const [tooltip, setTooltip] = useState<{
        visible: boolean;
        x: number;
        y: number;
        content: string;
    }>({
        visible: false,
        x: 0,
        y: 0,
        content: "",
    });

    /**
     * 1) Async Fetch the World Map (GeoJSON).
     */
    useEffect(() => {
        const fetchGeoJSON = async () => {
            try {
                const response = await fetch(
                    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"
                );
                if (!response.ok) throw new Error("Failed to load GeoJSON");
                const data = await response.json();
                setGeoJSON(data);
            } catch (error) {
                console.error("Error fetching GeoJSON:", error);
            }
        };

        fetchGeoJSON();
    }, []);

    /**
     * 2) Once GeoJSON & expenses are loaded, render the map.
     */
    useEffect(() => {
        if (!svgRef.current || !geoJSON || !expenses.length) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous render

        // Create a <g> to group map layers
        const mapGroup = svg.append("g");

        // Create a zoom behavior
        const zoomBehavior = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent([1, 8])
            .on("zoom", (event) => {
                // Move and scale the mapGroup (countries + circles)
                mapGroup.attr("transform", event.transform);

                // Scale circles so they're not huge when zoomed in
                mapGroup.selectAll<SVGCircleElement, Expense>("circle").attr("r", (d) => {
                    const baseRadius = radiusScale(d.amount);
                    return baseRadius / event.transform.k; // circles shrink with zoom
                });
            });

        svg.call(zoomBehavior);

        /**
         * 3) Build a small FeatureCollection for the expense points,
         *    so we can auto-fit the projection to show all markers.
         */
        const expenseFeatures = expenses.map((exp) => ({
            type: "Feature" as const,
            properties: { name: exp.name },
            geometry: {
                type: "Point" as const,
                coordinates: [exp.longitude, exp.latitude],
            },
        }));

        const pointsGeoJSON = {
            type: "FeatureCollection" as const,
            features: expenseFeatures,
        };

        // 4) Create a projection that fits the expense points
        const projection = d3.geoNaturalEarth1();
        // If there's only one expense, fallback to the entire world
        if (expenseFeatures.length === 1) {
            // If there's only one point, just fit the entire world
            projection.fitSize([width, height], geoJSON);
        } else {
            // Fit to bounding box of expense points
            projection.fitExtent(
                [
                    [0, 0],
                    [width, height],
                ],
                pointsGeoJSON
            );
        }

        const pathGenerator = d3.geoPath().projection(projection);

        /**
         * 5) Draw the base world map.
         *    We'll color it a bit more richly, e.g. #c2e0f4, and outline countries.
         */
        mapGroup
            .selectAll("path")
            .data(geoJSON.features)
            .enter()
            .append("path")
            .attr("d", pathGenerator as any)
            .attr("fill", "#c2e0f4") // A nice light blue
            .attr("stroke", "#fafafa")
            .attr("stroke-width", 0.5);

        /**
         * 6) Circle size scale, based on amounts
         */
        const radiusScale = d3
            .scaleSqrt<number>()
            .domain([0, d3.max(expenses, (d) => d.amount) || 1])
            .range([2, 15]); // smaller minimum radius

        /**
         * 7) Plot expense circles
         */
        const circles = mapGroup
            .selectAll("circle")
            .data(expenses)
            .enter()
            .append("circle")
            .attr("cx", (d) => {
                const coords = projection([d.longitude, d.latitude]);
                return coords ? coords[0] : 0;
            })
            .attr("cy", (d) => {
                const coords = projection([d.longitude, d.latitude]);
                return coords ? coords[1] : 0;
            })
            .attr("r", (d) => radiusScale(d.amount))
            .attr("fill", "red")
            .attr("opacity", 0.7)
            .on("mouseover", (event, d) => {
                setTooltip({
                    visible: true,
                    x: event.clientX,
                    y: event.clientY,
                    content: `${d.name}: ${d.amount} ${d.currency || ""}`,
                });
            })
            .on("mousemove", (event) => {
                setTooltip((prev) => ({
                    ...prev,
                    x: event.clientX,
                    y: event.clientY,
                }));
            })
            .on("mouseout", () => {
                setTooltip((prev) => ({ ...prev, visible: false }));
            });

        // If we want to jump to a "best fit" even if there's only one point
        // we could do an additional check or logic for that scenario, but
        // the above logic covers it well enough in practice.

    }, [geoJSON, expenses, width, height]);

    return (
        <div className="relative w-full flex justify-center">
            {!geoJSON ? (
                <p className="text-gray-500 text-sm">Loading map...</p>
            ) : (
                <svg ref={svgRef} width={width} height={height} />
            )}

            {tooltip.visible && (
                <div
                    className="absolute bg-white border rounded px-2 py-1 shadow text-sm"
                    style={{
                        top: tooltip.y,
                        left: tooltip.x,
                        pointerEvents: "none",
                        transform: "translate(-50%, -120%)",
                    }}
                >
                    {tooltip.content}
                </div>
            )}
        </div>
    );
};
