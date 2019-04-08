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
   res.redirect("/");
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
app.put("/items/:id",isLoggedIn,function (req,res) {
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
app.delete("/items/:id",isLoggedIn,function (req,res) {
  Item.findByIdAndRemove(req.params.id,function (err) {
      if (err) {
        console.log(err);
      }else {
        res.redirect("/");
      }
  });
});
//edit route
app.get("/items/:id/edit",isLoggedIn,function (req,res) {
  Item.findById(req.params.id,function (err,data) {
    if (err) {
      console.log(err);
    }else {
      res.render("edit",{item:data});
    }
  });
});

//rent Book
app.get('/rentBook/:id',function(req,res){
  Item.findById(req.params.id,function (err,data) {
    if (err) {
      console.log(err);
    }else {
      res.render("rentItem",{item:data});
    }
  });
});
//ship address
app.post('/rentBook/:id',function(req,res){
  Transaction.create({
    item : req.params.id,
    shippingAddress : req.body.address,
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
app.get('/dashboard',function(req,res){
  User.findOne({username : req.user.username}).populate("rented").populate("onRent").exec(
    function(err,user){
      if (err) {
        console.log(err);
      }else {
        //console.log(user);
        res.render('dashboard',{user:user});
      }
    }
  );
});

//middleware login
function isLoggedIn(req,res,next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect('/login');
}

//error 404
app.get('*',function(req,res){
  res.redirect('/');
});

//app running on port
app.listen(8080,function(){
  console.log('Server running on port 8080');
});
