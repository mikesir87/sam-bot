import { ErrorMessage } from "../src/errorMessage";

describe("ErrorMessage", () => {

  it("should create the error correctly", () => {
    const errorMessage = new ErrorMessage(404, "Something isn't found");
    expect(errorMessage.errorCode).toEqual(404);
    expect(errorMessage.message).toEqual("Something isn't found");
  });

});
