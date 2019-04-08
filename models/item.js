// import package
var mongoose = require("mongoose");

// create a User schema
var itemSchema = new mongoose.Schema({
  title       : String,
  publication : String,
  authors     : String,
  edition     : String,
  rent        : Number,
  deposit     : Number,
  penalty     : Number,
  ownedBy: {
      id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
      },
      username: String
  }
  });


// export the model
module.exports = mongoose.model("Item", itemSchema);
