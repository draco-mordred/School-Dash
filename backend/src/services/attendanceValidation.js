/**
 * Haversine formula calculating exact geographical distance between two points in meters
 */
function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
/**
 * Validates if a medical student is within the acceptable physical radius of their clinical ward posting
 */
export async function validateClinicalPresence(studentCoords, hospitalUnitCoords, acceptableRadiusMeters = 200 // Default geofence distance limit
) {
    const distance = calculateDistanceInMeters(studentCoords.latitude, studentCoords.longitude, hospitalUnitCoords.latitude, hospitalUnitCoords.longitude);
    return {
        insideGeofence: distance <= acceptableRadiusMeters,
        varianceMeters: Math.round(distance)
    };
}
