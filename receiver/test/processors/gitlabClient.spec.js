import { GitlabClient } from "../../src/processors/gitlabClient";

describe("GitlabClient", () => {
  const URL = "https://somewhere.gitlab.com";
  const TOKEN = "a-super-secret-token";

  // Using object with promise reference to allow overriding per class
  const mockedResponse = { promise : Promise.resolve({}) };
  let fetchClient;

  let client;

  beforeEach(() => {
    fetchClient = jasmine.createSpy("fetch").and.callFake(() => mockedResponse.promise);
    mockedResponse.promise = Promise.resolve({});
    client = new GitlabClient(URL, TOKEN, fetchClient);
  });

  it("constructs the client correctly", () => {
    expect(client.baseUrl).toEqual(URL);
    expect(client.secretToken).toEqual(TOKEN);
    expect(client.fetch).toEqual(fetchClient);
  });

  it("posts a comment correctly", async () => {
    mockedResponse.promise = Promise.resolve(createResponse(200, { message : "HI" }));

    const response = await client.postComment(123, 234, "A comment");

    expect(fetchClient).toHaveBeenCalledWith(`${URL}/projects/123/merge_requests/234/notes`, {
      method : "POST",
      body : "{\"body\":\"A comment\"}",
      headers : { "Private-Token": TOKEN, "Content-Type": "application/json" },
    });
    expect(response.message).toEqual("HI");
  });

  it("gets changes correctly", async () => {
    mockedResponse.promise = Promise.resolve(createResponse(200, { changes : [] }));

    const response = await client.getChanges(123, 234);

    expect(fetchClient).toHaveBeenCalledWith(`${URL}/projects/123/merge_requests/234/changes`, {
      headers : { "Private-Token": TOKEN },
    });
    expect(response.changes).toEqual([]);
  });

  it("merges successfully", async () => {
    mockedResponse.promise = Promise.resolve(createResponse(200, { success : true }));

    const response = await client.acceptMergeRequest(123, 234, "abcdef12");

    expect(fetchClient).toHaveBeenCalledWith(`${URL}/projects/123/merge_requests/234/merge`, {
      method : "PUT",
      body : "{\"sha\":\"abcdef12\"}",
      headers : { "Private-Token": TOKEN, "Content-Type": "application/json" },
    });
    expect(response.success).toBe(true);
  })

  it("throws an error with non-2xx response", async () => {
    mockedResponse.promise = Promise.resolve(createResponse(404, { success : false }));

    try {
      await client.getChanges(123, 234);
      fail("Should have thrown error");
    } catch (err) {
      expect(err.json.success).toBe(false);
      expect(err.message).toEqual("Not found");
    }
  });

  const createResponse = (status, body) => ({
    status,
    statusText : (status === 200) ? "OK" : "Not found",
    body : JSON.stringify(body),
    json : () => Promise.resolve(body),
  });
});
