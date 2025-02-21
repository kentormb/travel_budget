import React, { useEffect, useRef } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap,
} from "react-leaflet";
import L from "leaflet";
import { GestureHandling } from "leaflet-gesture-handling";
import "leaflet/dist/leaflet.css";
import "leaflet-gesture-handling/dist/leaflet-gesture-handling.css";
import { getCurrencySymbol } from "@/utils/helpers";

// Define a custom icon (adjust paths as needed)
const customIcon = new L.Icon({
    iconUrl: "/assets/icons/marker-icon-2x.png", // Replace with your icon path
    iconSize: [30, 52],
    iconAnchor: [22, 38],
    popupAnchor: [-3, -40],
    shadowUrl: "/assets/icons/marker-shadow.png",
    shadowSize: [41, 41],
    shadowAnchor: [20, 27],
});

// --- Helper: Group expenses by location ---
interface Expense {
    latitude: number | string;
    longitude: number | string;
    amount: number;
    name: string;
    currency?: string;
    location?: string;
}

interface GroupedMarker {
    currency: string;
    location: string;
    count: number;
    total: number;
    latitude: number;
    longitude: number;
}

function groupExpensesByLocation(expenses: Expense[]): GroupedMarker[] {
    const groups: Record<
        string,
        {
            count: number;
            total: number;
            currency: string;
            latitudes: number[];
            longitudes: number[];
        }
    > = {};

    expenses.forEach((exp) => {
        // Force conversion to numbers
        const lat = Number(exp.latitude);
        const lng = Number(exp.longitude);

        // Only process expenses with valid numeric coordinates
        if (isNaN(lat) || isNaN(lng)) {
            return;
        }
        const loc = exp.location?.trim() && exp.latitude && exp.longitude ? exp.location?.trim() : "Unknown";
        if (!groups[loc]) {
            groups[loc] = { count: 0, total: 0, currency: exp.currency, latitudes: [], longitudes: [] };
        }
        groups[loc].count += 1;
        groups[loc].total += exp.amount;
        groups[loc].latitudes.push(lat);
        groups[loc].longitudes.push(lng);
    });

    return Object.entries(groups).map(([location, data]) => {
        const avgLat =
            data.latitudes.length > 0
                ? data.latitudes.reduce((a, b) => a + b, 0) / data.latitudes.length
                : 0;
        const avgLng =
            data.longitudes.length > 0
                ? data.longitudes.reduce((a, b) => a + b, 0) / data.longitudes.length
                : 0;
        return {
            location,
            count: data.count,
            total: data.total,
            currency: data.currency,
            latitude: avgLat,
            longitude: avgLng,
        };
    });
}

interface UpdateMapViewProps {
    position: [number, number];
    zoom: number;
    markers: GroupedMarker[];
}
const UpdateMapView: React.FC<UpdateMapViewProps> = ({ markers }) => {
    const map = useMap();

    useEffect(() => {
        if (markers.length > 0) {
            const bounds = L.latLngBounds(
                markers.filter((place: any) => place.latitude && place.longitude).map((marker) => [marker.latitude, marker.longitude] as [number, number])
            );

            if (markers.length === 1) {
                map.setView([markers[0].latitude, markers[0].longitude], 12);
            } else {
                map.fitBounds(bounds, { padding: [10, 10] });
            }
        }
    }, [markers, map]);

    return null;
};

const GestureHandlingSetter: React.FC = () => {
    const map = useMap() as any;
    map.gestureHandling.enable();
    map.addHandler("gestureHandling", GestureHandling);
    return null;
};

interface MapViewProps {
    position: [number, number];
    zoom: number;
    expenses: Expense[];
}
const MapView: React.FC<MapViewProps> = ({ position, zoom, expenses }) => {
    // Filter out expenses with invalid coordinates
    const validExpenses = expenses.filter((exp) => {
        const lat = Number(exp.latitude);
        const lng = Number(exp.longitude);
        return !isNaN(lat) && !isNaN(lng);
    });
    const groupedMarkers = groupExpensesByLocation(validExpenses);
    const unknownExpenses = groupedMarkers.filter((m) => m.location === "Unknown")[0] || null;

    return (
        <div>
            <MapContainer
                {...({center: position, zoom: zoom} as any)}
                style={{height: "500", width: "300", minHeight: "90dvh"}}
                scrollWheelZoom={false}
            >
                <GestureHandlingSetter/>
                <TileLayer
                    {...({
                        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                        attribution:
                            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    } as any)}
                />
                {groupedMarkers.map((group, index) => (
                    (group.location !== "Unknown" && (
                        <Marker
                            key={index}
                            position={[group.latitude, group.longitude]}
                            icon={customIcon as L.Icon}
                        >
                            <Popup>
                                <div>
                                    <strong>{group.location}</strong>
                                    <br/>
                                    {group.count} expense{group.count > 1 ? "s" : ""}
                                    <br/>
                                    Total: {group.total.toFixed(2)} {getCurrencySymbol(group.currency)}
                                </div>
                            </Popup>
                        </Marker>
                    ))
                ))}
                <UpdateMapView position={position} zoom={zoom} markers={groupedMarkers}/>
            </MapContainer>
            {(unknownExpenses &&
                <div
                    className="flex justify-between px-4 py-2 bg-white rounded-md shadow-sm mt-4"
                >
                    <span className="text-gray-600 font-medium">{unknownExpenses.count} Unknown places</span>
                    <span className="text-gray-900 font-semibold">
                      Total: {unknownExpenses.total.toFixed(2)} {getCurrencySymbol(unknownExpenses.currency)}
                    </span>
                </div>
            )}
        </div>
    );
};

export default MapView;
