// LeafletMap.tsx
import React, { useEffect } from "react";
import {
    MapContainer,
    TileLayer,
    CircleMarker,
    Popup,
    useMap,
} from "react-leaflet";
import L from "leaflet";

interface Expense {
    latitude: number;
    longitude: number;
    amount: number;
    name: string;
    currency?: string;
    location?: string;
}

interface LeafletMapProps {
    expenses: Expense[];
    width?: number;
    height?: number;
}

export function LeafletMap({
                               expenses,
                               width = 300,
                               height = 500,
                           }: LeafletMapProps) {
    // Compute bounds from expenses (or use a default center if none exist)
    const defaultCenter: [number, number] = [51.505, -0.09];
    const defaultBounds: L.LatLngBoundsExpression =
        expenses.length > 0
            ? L.latLngBounds(
                expenses.map((exp) => [exp.latitude, exp.longitude] as [number, number])
            )
            : [defaultCenter, defaultCenter];

    return (
        <div style={{ width, height }}>
            <MapContainer
                bounds={defaultBounds}
                boundsOptions={{ padding: [50, 50] }}
                style={{ height: "500px", width: "300px" }}
                whenCreated={(map) => {
                    // Disable scroll wheel zoom once the map is created.
                    map.scrollWheelZoom.disable();
                }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    // Cast the attribution prop so TypeScript accepts it.
                    {...({
                        attribution:
                            '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors',
                    } as any)}
                />

                {expenses.map((exp, idx) => (
                    <CircleMarker
                        key={idx}
                        center={[exp.latitude, exp.longitude]}
                        // Casting props to any so that 'radius' is accepted.
                        {...({
                            radius: 5 + Math.sqrt(exp.amount),
                            color: "red",
                            fillColor: "red",
                            fillOpacity: 0.5,
                        } as any)}
                    >
                        <Popup>
                            <div>
                                <strong>{exp.name}</strong>
                                <br />
                                Amount: {exp.amount} {exp.currency}
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}

                <FitBounds expenses={expenses} />
            </MapContainer>
        </div>
    );
}

/**
 * FitBounds adjusts the map view so that all expense markers are visible.
 */
function FitBounds({ expenses }: { expenses: Expense[] }) {
    const map = useMap();

    useEffect(() => {
        if (!expenses.length) return;
        const bounds = L.latLngBounds(
            expenses.map((e) => [e.latitude, e.longitude] as [number, number])
        );
        map.fitBounds(bounds, {
            padding: [30, 30],
            maxZoom: 12,
        });
    }, [expenses, map]);

    return null;
}
