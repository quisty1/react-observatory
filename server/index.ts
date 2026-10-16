import { createApp } from "./app";
import { renderVideo } from "./render";
createApp(renderVideo).listen(3002, "127.0.0.1", () =>
  console.log("Observatory render: http://127.0.0.1:3002"),
);
