const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const encrypt = require('mongoose-encryption')

const app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))
app.set('view engine', 'ejs')

mongoose.connect('mongodb://localhost:27017/userDB', { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true]
    },
    password: {
        type: String,
        required: [true]
    }
})

const secret = 'enter string here'
userSchema.plugin(encrypt, { secret, encryptedFields: ['password'] })

const User = mongoose.model('User', userSchema)

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
            const { email, password } = req.body
            const registerCheck = await User.findOne({ email })
            if (registerCheck) {
                res.send('This email address has already been registered. Please use the login page instead.')
            } else {
                const newUser = new User({ email, password })
                await newUser.save()
                res.render('secrets')
            }
        } catch (err) {
            res.send('Error with making user account, please try again.')
        }
    })

app.route('/login')
    .get((req, res) => {
        res.render('login')
    })
    .post(async (req, res) => {
        try {
            const { email, password } = req.body
            const foundUser = await User.findOne({ email })
            if (foundUser) {
                if (foundUser.password === password) {
                    res.render('secrets')
                } else {
                    res.send("Password doesn't match, please try again.")
                }
            } else {
                res.send('No record of that username was found.')
            }
        } catch (err) {
            res.send('Error with logging in, please try again.')
        }
    })