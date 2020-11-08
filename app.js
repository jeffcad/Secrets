require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const FacebookStrategy = require('passport-facebook').Strategy
const findOrCreate = require('mongoose-findorcreate')

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

const userSchema = new mongoose.Schema({
    secret: String,
    googleId: String,
    facebookId: String
})

userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate)

const User = mongoose.model('User', userSchema)

passport.use(User.createStrategy())

passport.serializeUser((user, done) => {
    done(null, user.id)
})

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user)
    })
})

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_ID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/secrets',
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user)
        })
    }
))

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: 'http://localhost:3000/auth/facebook/secrets'
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ facebookId: profile.id }, function (err, user) {
            return cb(err, user);
        })
    }
))

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
            })(req, res)
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
        })(req, res)
    })

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] }))

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Successful authentication, redirect to secrets page
        res.redirect('/secrets')
    })

app.get('/auth/facebook',
    passport.authenticate('facebook'))

app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    (req, res) => {
        // Successful authentication, redirect to secrets page
        res.redirect('/secrets');
    })

app.get('/secrets', async (req, res) => {
    try {
        const usersWithSecrets = await User.find({ 'secret': { $ne: null } })
        if (usersWithSecrets) {
            res.render('secrets', { usersWithSecrets })
        }
    } catch (err) {
        console.log('Error with getting secrets: ', err)
        res.redirect('/secrets')
    }
})

app.route('/submit')
    .get((req, res) => {
        if (req.isAuthenticated()) {
            res.render('submit')
        } else {
            res.redirect('/login')
        }
    })
    .post(async (req, res) => {
        try {
            const submittedSecret = req.body.secret
            const foundUser = await User.findById(req.user.id)
            if (foundUser) {
                foundUser.secret = submittedSecret
                await foundUser.save()
                res.redirect('/secrets')
            }
        } catch (err) {
            console.log('Error with submitting secret: ', err)
            res.redirect('/secrets')
        }
    })

app.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
})