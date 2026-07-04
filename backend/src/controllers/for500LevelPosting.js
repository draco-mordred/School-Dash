//  import logActivity from "../utils/activitieslog";
// ClinicalRotation model is loaded lazily to avoid module resolution errors during test bootstrapping
async function loadClinicalRotation() {
    // import the ClinicalRotation model directly
    return (await import("../models/clinicalRotation")).default;
}
export {};
