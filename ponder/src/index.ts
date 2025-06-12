import { ponder } from "@/generated";

ponder.on("ChatApp:UserRegistered", async ({ event, context }) => {
  const { User } = context.db;
  
  await User.create({
    id: event.args.user.toLowerCase(),
    data: {
      userId: event.args.userId,
      registeredAt: event.block.timestamp,
      registeredAtBlock: event.block.number,
      messageCount: 0,
      karma: 0,
    },
  });
});

ponder.on("ChatApp:MessageSent", async ({ event, context }) => {
  const { Message, User } = context.db;
  
  // Create message
  await Message.create({
    id: event.args.msgId.toString(),
    data: {
      user: event.args.user.toLowerCase(),
      userId: event.args.userId,
      content: event.args.message,
      timestamp: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    },
  });
  
  // Update user message count
  await User.update({
    id: event.args.user.toLowerCase(),
    data: ({ current }) => ({
      messageCount: current.messageCount + 1,
    }),
  });
});

ponder.on("ChatApp:KarmaChanged", async ({ event, context }) => {
  const { KarmaEvent, User } = context.db;
  
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
  
  // Create karma event
  await KarmaEvent.create({
    id: eventId,
    data: {
      user: event.args.user.toLowerCase(),
      karma: Number(event.args.karma),
      timestamp: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    },
  });
  
  // Update user karma
  await User.update({
    id: event.args.user.toLowerCase(),
    data: {
      karma: Number(event.args.karma),
    },
  });
});