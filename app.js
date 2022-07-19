const express =require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const { log } = require('console')
const mongoose= require('mongoose')
mongoose.connect('mongodb://localhost:27017/userDB')
const encrypt=require('mongoose-encryption')
const bcrypt= require('bcrypt')
const saltRounds=10
const app=express()

app.use(express.static('public'))
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended:true}))

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

const User = new mongoose.model('User', userSchema);

app.route('/')

.get(function(req,res){
    res.render('home')
})

app.route('/login')

.get(function(req,res){
    res.render('login')
})
.post(function(req,res){
    const username = req.body.username;
    const password= req.body.password;
    User.findOne({email: username},function(err,foundUser){
        if(!err){
            if(foundUser){
                console.log(foundUser.password);
                console.log(password);
                    bcrypt.compare(password, foundUser.password, function(err, result){
                        if(result===true){
                            res.render('secrets')
                        }
                })
        }
    }})
})

app.route('/register')

.get(function(req,res){
    res.render('register')
})
.post(function(req,res){

    bcrypt.hash(req.body.password, saltRounds, function(err, hash){
    const newUser = new User({
        email: req.body.username,
        password: hash
    })
    newUser.save(function(err){
        if(err){
            console.log(err);
        } else {
            res.render('secrets')
        }
    })
})

})



app.listen(3000, function(){
    console.log('server started on port 3000');
})