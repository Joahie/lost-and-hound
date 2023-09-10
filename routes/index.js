const express = require('express');
const router = require('express').Router();
const { render } = require('ejs');
const { application } = require('express');
const mongoclient = global.mongoclient;
const MongoAccounts = mongoclient.db("paws").collection("accounts")
const MongoPets = mongoclient.db("paws").collection("pets")
const env = require("dotenv").config()
const random_uuid = uuidv4();
const OpenAI = require("openai");
const openai = new OpenAI({
  apiKey:process.env.KEY
});

const fileUpload = require('express-fileupload');
router.use(fileUpload());

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, 
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

router.use(express.static('public'));
//Middleware for cookie authentication
const isAuth = (req, res, next)=>{
    if(req.session.email){
        next()
    }else{
        req.session.nextRedirect = req.originalUrl
        res.redirect('/signin')
    }
}
//Rendering home page
router.get('/', (req, res)=>{
    res.render('index', {user: req.session.email})
})
//Rendering sign in page
router.get("/reportAPet", (req, res)=>{
    res.render("reportAPet", { 
        user: req.session.email,
        done: null,
    })
})

router.get("/listings", async (req, res)=>{
    var listings = await MongoPets.find({}).toArray()
    listings = listings.reverse()
    res.render("listings", { 
        user: req.session.email,
        listing: listings,
    })
})
router.get("/about", (req, res)=>{
    res.render("about", { 
        user: req.session.email,
        done: null,
    })
})

router.post("/reportAPet",  async (req, res)=>{
    const { image } = req.files;
    var uuid = uuidv4()
    if (!image) return res.sendStatus(400);
 image.mv(__dirname + '/upload/' + uuid+".png");
console.log(req.session.email)
    if(req.session.email == null){
        res.render("reportAPet", { 
            user: null,
            done: false,
        })
    }
    var answer = req.body
    var results0 = await MongoAccounts.findOne({email: req.session.email})
    var username = results0.name;
    const d = new Date();
    var date = d.getMonth() + "/" + d.getDate() + "/" + d.getFullYear();
    var total = await MongoPets.count({})

    await MongoPets.insertOne({ species: answer.species, petName: answer.name, city: answer.city, citySearch: answer.city.toLowerCase(), state: answer.state, stateSearch:answer.state.toLowerCase(), breed: answer.breed, reward: answer.reward, additional: answer.additional, email: req.session.email, name: username, image: uuid + ".png", date: date, number: total})
    return res.render("reportAPet", { 
        user: req.session.email,
        done: true,
    })
})
router.post("/listingsSearch",  async (req, res)=>{
    var answer = req.body;
    var results = await MongoPets.find({}).toArray()
    var endString = ""
    for(let i = 0; i<results.length; i ++){
        let temp = "S: "+results[i].species+ ". PN: "+results[i].petName + ". L: "+results[i].city + "," +results[i].state + ". B: " + results[i].breed +". D: " +results[i].additional + ". "
        let tempInt = i + 1
        endString += tempInt + ". " + temp
    }
    const trainingSection = "I'm going to give you a list of pet descriptions and a search query. Could you go through the pet descriptions and see if any of them are similar to the query? If so, type the corresponding number. If not, say false. You are only allowed to say \"false\" or the number that the search query corresponds to. Within each description of pets (separated by numbers) there will be specific information. S: species. PN: pet name. L: location. B: breed. D: extra information. When searching, make sure to take into account the breed of the animal. For example, if the breed is a golden retriever and the search query is a blond dog, it would be the golden retriever because they're blond. Also take into account the location of the animal. The descriptions are separated by numbers. Descriptions:"
    const searchQuery = "Search query: " + answer.search
    const finalString = trainingSection + endString + searchQuery
    
const gpt=async(prompt)=>{
    const chatCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{"role": "user", "content": prompt,}],
        max_tokens:100
      });
      return chatCompletion.choices[0].message.content;
    }
    var databaseId = await gpt(finalString)
    if(databaseId.toLowerCase() == "false"){
        return res.render("results",{
        user: req.session.email,
        result: false,
        })
    }
    console.log(databaseId)
    databaseId = databaseId -1;

    var searchResult =  results[databaseId]
    console.log(results)
    console.log(searchResult)
    return res.render("results",{
        result: true,
        user: req.session.email,
        reward: searchResult.reward,
        petName: searchResult.petName,
        species: searchResult.species,
        description: searchResult.description,
        image: searchResult.image,
        breed: searchResult.breed,
        city: searchResult.city,
        state: searchResult.state,
        reward: searchResult.reward,
        email: searchResult.email,
        date: searchResult.date,

    })


    return

    var username = results0.name;
    const d = new Date();
    var date = d.getMonth() + "/" + d.getDate() + "/" + d.getFullYear();
    var total = await MongoPets.count({})

    await MongoPets.insertOne({ species: answer.species, petName: answer.name, city: answer.city, citySearch: answer.city.toLowerCase(), state: answer.state, stateSearch:answer.state.toLowerCase(), breed: answer.breed, reward: answer.reward, additional: answer.additional, email: req.session.email, name: username, image: uuid + ".png", date: date, number: total})
    return res.render("reportAPet", { 
        user: req.session.email,
        done: true,
    })
})


//Rendering sign in page
router.get("/signin", (req, res)=>{
    res.render("signin", { 
        incorrect: false,
        user: req.session.email,
        email: null,
        password: null,
        emailNonexistent: false,
        passwordWrong: false,
    })
})

//Signing in
router.post("/signin", async (req, res)=>{
    var answer = req.body
    var results = await MongoAccounts.findOne({ email: answer.email.toLowerCase()})
    if(results == null){
        return res.render("signin", {
            incorrect: false,
            user: req.session.email,
            email: answer.email,
            password: answer.password,
            emailNonexistent: true,
            passwordWrong: false,
        })          
    }
    var results1 = await MongoAccounts.findOne({ email: answer.email.toLowerCase(), password: answer.password})
    if(results1 == null){
        return res.render("signin", {
            incorrect: false,
            user: req.session.email,
            email: answer.email,
            password: answer.password,
            emailNonexistent: false,
            passwordWrong: true,
        })          
    }
    req.session.email = answer.email.toLowerCase()
    return res.redirect(req.session.nextRedirect || "/")
})

//Rendering sign up page
router.get("/signup", (req, res)=>{
    res.render("signup", { 
        name: null,
        email: null,
        password1: null,
        password2: null,
        incorrect: false,
        user: req.session.email,
        alreadyExists: false,
        passwordWrong: false,
        submitted: false,
    })
})

router.post("/signup", async (req, res)=>{
    var answer = req.body
    var results = await MongoAccounts.findOne({ email: answer.email.toLowerCase()})
    if(results){
        return res.render("signup", {
            submitted: false,
            incorrect: false,
            user: req.session.email,
            alreadyExists: true,
            passwordWrong: false,
            name: answer.name,
            email: answer.email,
            password1: answer.password,
            password2: answer.confirm_password,
        })
    }
    if(answer.password != answer.confirm_password){
        return res.render("signup", {
            submitted: false,
            incorrect: false,
            user: req.session.email,
            alreadyExists: false,
            passwordWrong: true,
            name: answer.name,
            email: answer.email,
            password1: answer.password,
            password2: answer.confirm_password,
        })
    }
    await MongoAccounts.insertOne({ email: answer.email.toLowerCase(), name: answer.name, password: answer.password} )
    req.session.email = answer.email.toLowerCase()
    return res.render("signup", {
        submitted: true,
        incorrect: false,
        user: req.session.email,
        alreadyExists: false,
        passwordWrong: false,
        name: answer.name,
        email: answer.email,
        password1: answer.password,
        password2: answer.confirm_password,
    })        
    
})
//Signing out
router.post('/signout', (req,res)=>{
    req.session.destroy(e => {
        if (e) return res.send(e);
        else return res.redirect("/")
    })
})


//404 page
router.all('*', (req, res) => {
    res.status(404).render('404', {                
        user: req.session.email
    });
});


module.exports = router;
