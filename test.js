app.get("/bookmark/:user", async (req, res) => {
  const { user } = req.params;
  const {page} = req.query
  const pageNumber = Number(page)
  const query = { user };
  const count = await bookmarks.find(query).toArray()
  const result = await bookmarks.find(query).skip((pageNumber - 1) * 7).limit(7).toArray();
  res.send({bookmarks:result, count:count.length});
});