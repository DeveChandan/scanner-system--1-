/*const mongoose = require("mongoose")

// Define a schema for storing data
const dataSchema = new mongoose.Schema({
  rawData: String,
  parsedData: {
    type: { type: String },
    status: String,
    productCode: String,
    serialNumber: String,
    counter: Number,
    lineNumber: String,
    shift: String,
    batchCode: String,
    materialCode: String,
    cartonSerial: String,
  },
  isValid: Boolean,
  errorMessage: String,
  timestamp: { type: Date, default: Date.now },
  scannerType: { type: String, enum: ["pouch", "tin", "dispatch", "unknown"], default: "unknown" },
})

// Add indexes for better query performance
dataSchema.index({ timestamp: -1 })
dataSchema.index({ "parsedData.cartonSerial": 1 })
dataSchema.index({ "parsedData.materialCode": 1 })
dataSchema.index({ "parsedData.batchCode": 1 })
dataSchema.index({ scannerType: 1 })

// Create models for each scanner
const Scanner1Model = mongoose.model("Scanner1Data", dataSchema)
const Scanner2Model = mongoose.model("Scanner2Data", dataSchema)
const Scanner3Model = mongoose.model("Scanner3Data", dataSchema)
const Scanner4Model = mongoose.model("Scanner4Data", dataSchema)
const Scanner5Model = mongoose.model("Scanner5Data", dataSchema)
const Scanner6Model = mongoose.model("Scanner6Data", dataSchema)
const Scanner7Model = mongoose.model("Scanner7Data", dataSchema)

module.exports = {
  Scanner1Model,
  Scanner2Model,
  Scanner3Model,
  Scanner4Model,
  Scanner5Model,
  Scanner6Model,
  Scanner7Model,
  dataSchema,
}

*/

//New Logic addd
const mongoose = require("mongoose")

// Define a schema for storing data
const dataSchema = new mongoose.Schema({
  rawData: String,
  parsedData: {
    type: { type: String },
    status: String,
    productCode: String,
    serialNumber: String,
    counter: Number,
    lineNumber: String,
    shift: String,
    batchCode: String,
    materialCode: String,
    cartonSerial: String,
  },
  isValid: Boolean,
  errorMessage: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // Add a unique identifier field to ensure uniqueness
  uniqueId: {
    type: String,
    unique: true,
    required: true,
  },
})

// Add indexes for better query performance
dataSchema.index({ timestamp: -1 })
dataSchema.index({ "parsedData.cartonSerial": 1 })
dataSchema.index({ "parsedData.materialCode": 1 })
dataSchema.index({ "parsedData.batchCode": 1 })
dataSchema.index({ isValid: 1, timestamp: -1 })
dataSchema.index({ isValid: 1, "parsedData.cartonSerial": 1 })

// Add a compound unique index for timestamp to ensure no duplicate timestamps
dataSchema.index({ timestamp: 1 }, { unique: true })

// Pre-save hook to check for duplicate timestamps
dataSchema.pre("save", async function (next) {
  const model = this.constructor

  // Check if a document with this timestamp already exists
  const existingDoc = await model.findOne({ timestamp: this.timestamp })

  if (existingDoc) {
    const err = new Error("Duplicate timestamp detected")
    err.code = 11000 // Set the error code to duplicate key error
    return next(err)
  }

  next()
})

// Create models for each scanner
const Scanner1Model = mongoose.model("Scanner1Data", dataSchema)
const Scanner2Model = mongoose.model("Scanner2Data", dataSchema)
const Scanner3Model = mongoose.model("Scanner3Data", dataSchema)
const Scanner4Model = mongoose.model("Scanner4Data", dataSchema)
const Scanner5Model = mongoose.model("Scanner5Data", dataSchema)
const Scanner6Model = mongoose.model("Scanner6Data", dataSchema)
const Scanner7Model = mongoose.model("Scanner7Data", dataSchema)

module.exports = {
  Scanner1Model,
  Scanner2Model,
  Scanner3Model,
  Scanner4Model,
  Scanner5Model,
  Scanner6Model,
  Scanner7Model,
  dataSchema,
}
