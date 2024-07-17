import { createAction, createActionRunner } from "@cyn/plugin-core";

export const ID = "fs:copy";

export const copy = createAction({
  id: ID,
  name: "Copy file",
  displayString: "`Copy ${params.from} to ${params.to}`",
  params: {
    from: {
      label: "From",
      value: "",
      control: {
        type: "path",
      },
    },
    to: {
      label: "To",
      value: "",
      control: {
        type: "path",
      },
    },
    recursive: {
        label: "Recursive",
        value: true,
        control: {
          type: "boolean",
        },
      },
  },

  outputs: {},
  description: "Copy a file or a folder from one location to another",
  icon: "",
  meta: {},
});

export const copyRunner = createActionRunner<typeof copy>(
  async ({ log, inputs }) => {
    const { cp } = await import("node:fs/promises");
    log("");

    console.log("inputs", inputs);

    const from = inputs.from;
    const to = inputs.to;

    console.log("from", from);
    console.log("to", to);

    if (!from) {
      throw new Error("Missing source");
    }

    if (!to) {
      throw new Error("Missing destination");
    }

    await cp(from, to, {
      recursive: inputs.recursive,
    });
  }
);
