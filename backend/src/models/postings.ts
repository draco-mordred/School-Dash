import mongoose, { Schema, Document } from "mongoose";

//Here we want to build a Posting model that etches a Class and The departments in the Current posting, and then split the class up equally based on the number of departments into groups which would then rotate accorting to the Posting's Department's rotationDurationWeeks value.

interface IPosting extends Document {
  _id: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId;
  //departments should return an array of departments that have the same postingType value, e.g: ostingType: "OG_PEDS", should return O&G and Pediatrics deparments (two departments in this case).
  department: mongoose.Types.ObjectId;
  rotationDurationWeeks: number;
  groups: string[][];
  createdAt: Date;
  startDate: Date;
  endDate: Date;
}

const PostingSchema: Schema = new Schema<IPosting>({
  
})