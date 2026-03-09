const fetch = jest.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => ({}),
  text: async () => "",
}))

export default fetch
