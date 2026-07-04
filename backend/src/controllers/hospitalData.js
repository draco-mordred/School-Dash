import HospitalUnitModel from "../models/hospitalUnit";
import HospitalStaffModel from "../models/hospitalStaff";
// ============ HOSPITAL UNITS ============
/**
 * POST /hospital-units
 * Create a new hospital unit
 */
export const createHospitalUnit = async (req, res) => {
    try {
        const { name, department, category, umbrella, description, supervisors } = req.body;
        if (!name || !department || !category || !umbrella) {
            return res.status(400).json({ error: "Missing required fields: name, department, category, umbrella." });
        }
        const unit = await HospitalUnitModel.create({
            name,
            department,
            category,
            umbrella,
            description,
            supervisors: supervisors || [],
        });
        return res.status(201).json({ message: "Hospital unit created successfully.", unit });
    }
    catch (error) {
        console.error("Error creating hospital unit:", error);
        return res.status(500).json({ error: "Failed to create hospital unit." });
    }
};
/**
 * GET /hospital-units
 * List all hospital units with filtering
 */
export const listHospitalUnits = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = parseInt(req.query.skip) || 0;
        const department = req.query.department;
        const category = req.query.category;
        const umbrella = req.query.umbrella;
        const filter = { isActive: true };
        if (department)
            filter.department = new RegExp(department, "i");
        if (category)
            filter.category = category;
        if (umbrella)
            filter.umbrella = umbrella;
        const total = await HospitalUnitModel.countDocuments(filter);
        const units = await HospitalUnitModel.find(filter)
            .populate("supervisors", "name designation")
            .sort({ department: 1, name: 1 })
            .limit(limit)
            .skip(skip);
        return res.status(200).json({ units, total, page: Math.floor(skip / limit) + 1, pages: Math.ceil(total / limit) });
    }
    catch (error) {
        console.error("Error listing hospital units:", error);
        return res.status(500).json({ error: "Failed to list hospital units." });
    }
};
/**
 * GET /hospital-units/:unitId
 * Get details of a specific unit
 */
export const getHospitalUnit = async (req, res) => {
    try {
        const { unitId } = req.params;
        const unit = await HospitalUnitModel.findById(unitId).populate("supervisors", "name designation fileNumber");
        if (!unit) {
            return res.status(404).json({ error: "Hospital unit not found." });
        }
        return res.status(200).json({ unit });
    }
    catch (error) {
        console.error("Error fetching hospital unit:", error);
        return res.status(500).json({ error: "Failed to fetch hospital unit." });
    }
};
/**
 * PATCH /hospital-units/:unitId
 * Update a hospital unit
 */
export const updateHospitalUnit = async (req, res) => {
    try {
        const { unitId } = req.params;
        const { name, description, supervisors, isActive } = req.body;
        const unit = await HospitalUnitModel.findByIdAndUpdate(unitId, { name, description, supervisors, isActive }, { returnDocument: 'after' });
        if (!unit) {
            return res.status(404).json({ error: "Hospital unit not found." });
        }
        return res.status(200).json({ message: "Hospital unit updated successfully.", unit });
    }
    catch (error) {
        console.error("Error updating hospital unit:", error);
        return res.status(500).json({ error: "Failed to update hospital unit." });
    }
};
// ============ HOSPITAL STAFF ============
/**
 * POST /hospital-staff
 * Create a new hospital staff record
 */
export const createHospitalStaff = async (req, res) => {
    try {
        const { fileNumber, name, qualification, designation, systemRole, department, assignedUnits, email, phone, canApproveLogbooks } = req.body;
        if (!fileNumber || !name || !designation || !department) {
            return res.status(400).json({ error: "Missing required fields: fileNumber, name, designation, department." });
        }
        const staff = await HospitalStaffModel.create({
            fileNumber,
            name,
            qualification,
            designation,
            systemRole: systemRole || "CONSULTANT",
            department,
            assignedUnits: assignedUnits || [],
            email,
            phone,
            canApproveLogbooks: canApproveLogbooks !== false, // default true
        });
        return res.status(201).json({ message: "Hospital staff created successfully.", staff });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: "File number already exists." });
        }
        console.error("Error creating hospital staff:", error);
        return res.status(500).json({ error: "Failed to create hospital staff." });
    }
};
/**
 * GET /hospital-staff
 * List all hospital staff with filtering
 */
export const listHospitalStaff = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = parseInt(req.query.skip) || 0;
        const department = req.query.department;
        const designation = req.query.designation;
        const systemRole = req.query.systemRole;
        const filter = { isActive: true };
        if (department)
            filter.department = new RegExp(department, "i");
        if (designation)
            filter.designation = designation;
        if (systemRole)
            filter.systemRole = systemRole;
        const total = await HospitalStaffModel.countDocuments(filter);
        const staff = await HospitalStaffModel.find(filter)
            .populate("assignedUnits", "name department category")
            .sort({ fileNumber: 1 })
            .limit(limit)
            .skip(skip);
        return res.status(200).json({ staff, total, page: Math.floor(skip / limit) + 1, pages: Math.ceil(total / limit) });
    }
    catch (error) {
        console.error("Error listing hospital staff:", error);
        return res.status(500).json({ error: "Failed to list hospital staff." });
    }
};
/**
 * GET /hospital-staff/:staffId
 * Get details of a specific staff member
 */
export const getHospitalStaff = async (req, res) => {
    try {
        const { staffId } = req.params;
        const staff = await HospitalStaffModel.findById(staffId).populate("assignedUnits", "name department category umbrella");
        if (!staff) {
            return res.status(404).json({ error: "Staff member not found." });
        }
        return res.status(200).json({ staff });
    }
    catch (error) {
        console.error("Error fetching hospital staff:", error);
        return res.status(500).json({ error: "Failed to fetch hospital staff." });
    }
};
/**
 * PATCH /hospital-staff/:staffId
 * Update a hospital staff record
 */
export const updateHospitalStaff = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { assignedUnits, email, phone, isActive, canApproveLogbooks } = req.body;
        const staff = await HospitalStaffModel.findByIdAndUpdate(staffId, { assignedUnits, email, phone, isActive, canApproveLogbooks }, { returnDocument: 'after' });
        if (!staff) {
            return res.status(404).json({ error: "Staff member not found." });
        }
        return res.status(200).json({ message: "Hospital staff updated successfully.", staff });
    }
    catch (error) {
        console.error("Error updating hospital staff:", error);
        return res.status(500).json({ error: "Failed to update hospital staff." });
    }
};
/**
 * POST /hospital-staff/bulk-import
 * Bulk import staff from roster data
 */
export const bulkImportStaff = async (req, res) => {
    try {
        const { staffData } = req.body;
        if (!Array.isArray(staffData)) {
            return res.status(400).json({ error: "staffData must be an array." });
        }
        const results = {
            created: 0,
            failed: 0,
            errors: [],
        };
        for (const data of staffData) {
            try {
                await HospitalStaffModel.updateOne({ fileNumber: data.fileNumber }, {
                    $setOnInsert: {
                        name: data.name,
                        qualification: data.qualification,
                        designation: data.designation,
                        department: data.department,
                        systemRole: data.systemRole || "CONSULTANT",
                        email: data.email,
                        phone: data.phone,
                        canApproveLogbooks: true,
                    },
                }, { upsert: true });
                results.created++;
            }
            catch (err) {
                results.failed++;
                results.errors.push({
                    fileNumber: data.fileNumber,
                    error: err instanceof Error ? err.message : "Unknown error",
                });
            }
        }
        return res.status(200).json({ message: "Bulk import completed.", ...results });
    }
    catch (error) {
        console.error("Error bulk importing staff:", error);
        return res.status(500).json({ error: "Failed to bulk import staff." });
    }
};
