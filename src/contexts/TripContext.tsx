import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Trip } from '@/types/trip';

type TripContextType = {
  currentTrip: string | null;
  setCurrentTrip: (tripId: string | null) => void;
  currentTripData: Trip | null;
  trips: Trip[];
};

const TripContext = createContext<TripContextType | undefined>(undefined);

export function TripProvider({ children }: { children: ReactNode }) {
  const [currentTrip, setCurrentTrip] = useState<string | null>(null);
  const [currentTripData, setCurrentTripData] = useState<Trip | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    // Load initial data
    const storedCurrentTrip = localStorage.getItem('selectedTripId');
    setCurrentTrip(storedCurrentTrip);
    const tripsData = JSON.parse(localStorage.getItem('trips') || '[]');
    setTrips(tripsData);

    // Set up storage event listener
    const handleStorageChange = () => {
      const updatedTrips = JSON.parse(localStorage.getItem('trips') || '[]');
      setTrips(updatedTrips);
      let newCurrentTrip = localStorage.getItem('selectedTripId');
      if (!newCurrentTrip && updatedTrips.length) {
        newCurrentTrip = updatedTrips[0]?.id;
      }
      setCurrentTrip(newCurrentTrip);
    };

    // Listen for both storage events and custom events
    window.addEventListener('storageChange', handleStorageChange);
    return () => {
      window.removeEventListener('storageChange', handleStorageChange);
    };
  }, []);

  // Update currentTripData whenever currentTrip or trips change
  useEffect(() => {
    if (currentTrip && trips.length > 0) {
      const tripData = trips.find(trip => trip.id === currentTrip);
      setCurrentTripData(tripData || null);
    } else {
      setCurrentTripData(null);
    }
  }, [currentTrip, trips]);

  return (
    <TripContext.Provider value={{ currentTrip, setCurrentTrip, currentTripData, trips }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
}
