var express          = require('express'),
    app              = express(),
    bodyParser       = require('body-parser'),
    methodOverride   = require("method-override"),
    expressSanitizer = require("express-sanitizer"),
    mongoose         = require('mongoose'),
    flash            = require("connect-flash"),
    passport         = require("passport"),
    LocalStrategy    = require("passport-local"),
    User             = require('./models/user'),
    Item             = require('./models/item'),
    Transaction      = require('./models/transaction');

//connect db
mongoose.connect('mongodb://localhost/BookRentalSystem',{ useNewUrlParser: true });

//app initialization
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(methodOverride("_method"));
app.use(expressSanitizer());
app.use(flash());

// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "Book Rental System Zindbad",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// middleware to create globle varible for currentUser
app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

//check and send mail every 24 hours
//setInterval(sendMailRemainingDays,10000);
//sendMailRemainingDays();

//index route
app.get('/',isLoggedIn,function (req,res) {
  res.redirect('/items');
});

// show register form
app.get("/register", function(req, res) {
    res.render("register");
});

// handle sign up logic
app.post("/register", function(req, res) {
// register an user from given request body
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function (err, user) {
        // callback details
        if (err) {
            // display flash error message from the database
           req.flash("error", err.message);
           return res.render("register");
       }
        // authenticate the given user
        passport.authenticate("local")(req, res, function () {
            // display the welcome flash notification and redirect
            req.flash("success", "Welcome to BRS " + user.username);
            res.redirect("/");
        });
    });
});

// show login form
app.get("/login", function(req, res) {
    res.render("login");
});

// handling login logic with passport middleware
app.post("/login", passport.authenticate("local",
    {
        successRedirect: "/",
        failureRedirect: "login"
    }), function(req, res) {
});

// log out route
app.get("/logout", function(req, res) {
   req.logout();
   req.flash("success", "Logged you out!"); // handle logout flash msg
   res.redirect("/login");
});

//items

//index route
app.get("/items",isLoggedIn,function (req,res) {
  Item.find({},function (err,data) {
    if (err) {
      console.log(err);
    }else {
      res.render("index",{items:data});
    }
  });
});

//show
app.get("/items/show/:id",isLoggedIn,function (req,res) {
  Item.findById(req.params.id,function (err,data) {
    if (err) {
      console.log(err);
    }else {
      res.render("show",{item:data});
    }
  });
});
//new
app.get("/items/new",isLoggedIn,function (req,res) {
  res.render("new");
});
//create route
app.post("/items",isLoggedIn,function (req,res) {
  //req.body.description = req.sanitize(req.body.description);
  var ownedBy = {
    id: req.user._id,
    username: req.user.username
  };
  Item.create({
    title : req.body.title,
    publication : req.body.publication,
    authors : req.body.authors,
    edition : req.body.edition,
    rent : req.body.rent,
    deposit : req.body.deposit,
    penalty : req.body.penalty,
    sold : false,
    ownedBy : ownedBy

  },function (err,data) {
    if (err) {
      console.log(err);
    }else {
      res.redirect("/");
      console.log(data);
    }
  });
});
//update route
app.put("/items/:id",checkOwnership,function (req,res) {
  //req.body.description = req.sanitize(req.body.description);
  Item.findByIdAndUpdate(req.params.id,req.body,function (err,data) {
    if (err) {
      console.log(err);
    }else {
      res.redirect("/items/show/"+req.params.id);
      console.log(data);
    }
  });
});
//delete route
app.delete("/items/:id",checkOwnership,function (req,res) {
  Item.findByIdAndRemove(req.params.id,function (err) {
      if (err) {
        console.log(err);
      }else {
        res.redirect("/");
      }
  });
});
//edit route
app.get("/items/:id/edit",checkOwnership,function (req,res) {
  Item.findById(req.params.id,function (err,data) {
    if (err) {
      console.log(err);
    }else {
      res.render("edit",{item:data});
    }
  });
});

//rent Book
app.get('/rentBook/:id',canRent,function(req,res){
  Item.findById(req.params.id,function (err,data) {
    if (err) {
      console.log(err);
    }else {
      res.render("rentItem",{item:data});
    }
  });
});
//ship address
app.post('/rentBook/:id',canRent,function(req,res){
  Item.findByIdAndUpdate(req.params.id,{$set : {sold : true}},function(err,data){
    if(err){
      console.log(err);
    }else {
      console.log(data);
    }
  });
  Transaction.create({
    item : req.params.id,
    shippingAddress : req.body.address,
    orderedBy : req.user.username,
    dueDate : Date.now() + 30*24*60*60*1000,
    approved : false
  },function(err,transaction){
    if(err){
      console.log(err);
    }else{
      //console.log(data);
      Item.findById(req.params.id,function(err,itemData){
        if(err){
          console.log(err);
        }else {
          //console.log(itemData.ownedBy);
          User.findByIdAndUpdate(itemData.ownedBy.id,{
            $push: { onRent: transaction._id }
          },function(err,userData){
            if (err) {
              console.log(err);
            }else {
              console.log(userData);
            }
          });
        }
      });
      User.findOneAndUpdate({username: req.user.username},{
        $push: { rented: transaction._id }
      },function(err,userData){
        if (err) {
          console.log(err);
        }else {
          console.log(userData);
        }
      });
    }
  });
  res.redirect('/dashboard');
});

//dashboard
app.get('/dashboard',isLoggedIn,function(req,res){
//how to nested populate https://stackoverflow.com/questions/19222520/populate-nested-array-in-mongoose
  User.findOne({username : req.user.username}).populate("rented").populate("onRent").populate({
    path : 'rented',
    populate : {
      path : 'item',
      model : 'Item'
    }
  }).populate({
    path : 'onRent',
    populate : {
      path : 'item',
      model : 'Item'
    }
  }).exec(
    function(err,user){
      if (err) {
        console.log(err);
      }else {
        //console.log(user);
        res.render('dashboard',{rented:user.rented,onRent:user.onRent});
        //res.send(user);
      }
    }
  );
});

app.post('/approveTransaction/:id',function(req,res){
  Transaction.findByIdAndUpdate(req.params.id,{ $set : { approved : true }},
    function(err,data){
    if(err){
      console.log(err);
    }else {
      //console.log(data);
      //res.send(data);
      res.redirect('/dashboard');
    }
  });
});

//middleware login
function isLoggedIn(req,res,next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect('/login');
}
//middleware checkOwnership
function checkOwnership(req,res,next){
  if (req.isAuthenticated()) {
        // find the campground with the requested id
        Item.findById(req.params.id, function (err, foundItem) {
            if (err) {
                req.flash("error", "Item not found!");
                res.redriect("back");
            } else {
                // does the user own the campground?
                if (foundItem.ownedBy.id.equals(req.user._id)) {
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that!");
                    res.redirect("back");
                }
            }
        });
    } else {
        // send flash notification to user to log in first
        req.flash("error", "You need to be logged in to do that!");
        res.redirect("back");
    }
}
//middleware cannot rent if owns it
function canRent(req,res,next){
  if (req.isAuthenticated()) {
        // find the campground with the requested id
        Item.findById(req.params.id, function (err, foundItem) {
            if (err) {
                req.flash("error", "Item not found!");
                res.redriect("back");
            } else {
                // does the user own the campground?
                if (foundItem.ownedBy.id.equals(req.user._id)) {
                  req.flash("error", "You don't have permission to do that!");
                  res.redirect("back");
                } else {
                  next();
                }
            }
        });
    } else {
        // send flash notification to user to log in first
        req.flash("error", "You need to be logged in to do that!");
        res.redirect("back");
    }
}
//should run everytime
function sendMailRemainingDays(){
  Transaction.find({},function(err,transactionData){
    if (err) {
      console.log(err);
    }else{
      transactionData.forEach((transactionData)=>{
        let timeDiff = Math.round((Date.parse(transactionData.dueDate) - Date.now())/(24*60*60*1000));
        console.log(timeDiff);
      });
    }
  });
}

//error 404
app.get('*',function(req,res){
  res.redirect('/');
});

//app running on port
app.listen(8080,function(){
  console.log('Server running on port 8080');
});
