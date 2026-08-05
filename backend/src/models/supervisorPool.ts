import mongoose from 'mongoose';

const SupervisorPoolSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  candidates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pointer: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('SupervisorPool', SupervisorPoolSchema);
