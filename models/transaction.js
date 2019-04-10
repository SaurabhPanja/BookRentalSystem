// import package
var mongoose = require("mongoose");

// create a User schema
var transactionSchema = new mongoose.Schema({
    date : {
      type : Date,
      default : Date.now()
    },
    dueDate : {
      type : Date,
      default : Date.now() + 30*24*60*60*1000
    },
    item :  {
      type  : mongoose.Schema.Types.ObjectId,
      ref   : "Item"
    },
    shippingAddress : String,
    orderedBy : String,
    approved : Boolean
  });


// export the model
module.exports = mongoose.model("Transaction", transactionSchema);
