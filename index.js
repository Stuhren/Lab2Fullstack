require("dotenv").config();
const express = require('express');
const app = express();
const path = require("path")

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.CONNECTION_URL;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        // Connect the client to the server    (optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("You are now connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}
run().catch(console.dir);


app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname,'index.html'))
})

app.get('/api/albums', async (req, res) => {
  await client.connect()
  try {
    const albums = await getAllAlbums();
    res.send(albums);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Server error' });
  }
});

app.get('/api/albums/:title', async (req, res) => {
  try {
    const title = req.params.title;
    const albumData = await findAlbumByTitle(title);

    if (albumData.length === 0) {
      res.status(404).send({ message: 'Album not found' });
    } else {
      res.send(albumData);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Server error' });
  }
});

app.post('/api/albums', async (req, res) => {
  const { title, artist, year } = req.body;
  console.log(`Title: ${title}, Artist: ${artist}, Year: ${year}`);
  const alreadyExists = await doesAlbumExist(title, artist)
  if (alreadyExists == false) {
    await addToDatabase({
      title: `${title}`,
      artist: `${artist}`,
      year: parseInt(year),
    });
    res.status(201).send({ message: 'Album received', title, artist, year });
  } else {
    res.status(409).send({ message: 'Album already exists in the database' });
  }
});

app.put('/api/albums/:id', async (req, res) => {
  const id = req.params.id;
  const updateData = req.body;

  await client.connect();
  try {
    const result = await client.db("music").collection("albums").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    res.send({ message: `${result.modifiedCount} record(s) updated.` });
  } catch (error) {
    console.error(error);
    res.status(404).send({ message: 'ID not found' });
  } finally {
    await client.close();
  }
});

  app.delete('/api/albums/:id', async (req, res) => {
    try {
      const id = req.body.id
      await deleteAlbum(id)
    } catch (error) {
      console.error(error)
      res.status(404).send({ message: 'ID not found' });
    }
  })


async function getAllAlbums() {
    await client.connect()
    const cursor = client.db("music").collection("albums").find();
    const results = await cursor.toArray();
    return JSON.stringify(results)
}


async function findAlbumByTitle(title) {
  try {
    await client.connect();
    const albumData = await client.db("music").collection("albums").find({ title: title }).toArray();

    return albumData;
  } catch (error) {
    console.error(error);
    throw new Error('Server error');
  } finally {
    await client.close();
  }
}


async function doesAlbumExist(title, artist) {
  try {
    await client.connect();
    const query = { title, artist};
    const albumData = await client.db("music").collection("albums").findOne(query);
    return albumData !== null;
  } catch (error) {
    console.log(error);
    return false;
  }
}


async function addToDatabase(newDocument) {
    const result = await client.db("music").collection("albums").insertOne(newDocument);
    console.log(`New listing created with the following id: ${result.insertedId}`);
}

async function deleteAlbum(id) {
  console.log(id)
  await client.connect()
  try {
        const query = { _id: new ObjectId(id) };
        await client.db("music").collection("albums").deleteOne(query);
  }
  catch (error) {
    console.log(error)
  }
}

app.listen(process.env.PORT, () => {
  console.log("Server listening on port: " + process.env.PORT)
})