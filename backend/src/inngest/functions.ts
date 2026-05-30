import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "my-app"});

// Your new function:
export const generateTimeTable = inngest.createFunction(
    { id: "hello-world", event: "test/hello.world"},
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "ls");
    return { message: `Hello ${event.data.email}`}
  }


  // { id: "hello-world" },
  // { event: "test/hello.world" },
  // async ({ event, step }: { event: any; step: any }) => {
  //   await step.sleep("wait-a-moment", "ls");
  //   return { message: `Hello ${event.data.email}!` };
  // }
);

// Add the function to the exported array:
// export const functions = [
//   helloWorld
// ]