// import package
var mongoose = require("mongoose");

// create a User schema
var transactionSchema = new mongoose.Schema({
    item :  {
      type  : mongoose.Schema.Types.ObjectId,
      ref   : "Item"
    },
    shippingAddress : String,
    approved : Boolean
  });


// export the model
module.exports = mongoose.model("Transaction", transactionSchema);
