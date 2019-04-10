// import package
var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

// create a User schema
var UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  money : {
    type : Number,
    default : 1000
  },
  rented : [
        { //item user has taken on rent from other
            type: mongoose.Schema.Types.ObjectId,
            ref: "Transaction"
        }
    ],
  onRent : [
        {//user's item is on rent
              type: mongoose.Schema.Types.ObjectId,
              ref: "Transaction"
        }
    ]
});

UserSchema.plugin(passportLocalMongoose); // adding method to user

// export the model
module.exports = mongoose.model("User", UserSchema);
