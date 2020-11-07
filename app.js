require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')

const app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))
app.set('view engine', 'ejs')

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())

mongoose.connect('mongodb://localhost:27017/userDB', { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.set('useCreateIndex', true)

const userSchema = new mongoose.Schema({})

userSchema.plugin(passportLocalMongoose)

const User = mongoose.model('User', userSchema)

passport.use(User.createStrategy())
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

const port = 3000
app.listen(port, console.log(`Server listening on port ${port}!`))

app.get('/', (req, res) => {
    res.render('home')
})

app.route('/register')
    .get((req, res) => {
        res.render('register')
    })
    .post(async (req, res) => {
        try {
            await User.register({ username: req.body.username }, req.body.password)
            passport.authenticate('local', {
                successRedirect: '/secrets',
                failureRedirect: '/register'
            })(req, res);
        } catch (err) {
            console.log('Error with registration: ', err)
            res.redirect('/register')
        }
    })

app.route('/login')
    .get((req, res) => {
        res.render('login')
    })
    .post((req, res) => {
        passport.authenticate('local', {
            successRedirect: '/secrets',
            failureRedirect: '/login'
        })(req, res);
    })

app.get('/secrets', (req, res) => {
    if (req.isAuthenticated()) {
        res.render('secrets')
    } else {
        res.redirect('/login')
    }
})

app.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
})