import {
  AnyThreadChannel,
  Client,
  DMChannel,
  ForumChannel,
  Message,
  NonThreadGuildBasedChannel,
} from "discord.js";
import { config } from "./config";
import {
  closeIssue,
  createIssue,
  createIssueComment,
  deleteIssue,
  getIssues,
  lockIssue,
  openIssue,
  unlockIssue,
} from "./github";
import { store } from "./store";

export async function handleClientReady(client: Client) {
  console.log(`Logged in as ${client.user?.tag}!`);

  store.threads = await getIssues();

  console.log("Issues loaded :", store.threads.length);

  client.channels.fetch(config.DISCORD_CHANNEL_ID).then((params) => {
    store.availableTags = (params as ForumChannel).availableTags;
  });
}

export async function handleThreadCreate(params: AnyThreadChannel) {
  if (params.parentId !== config.DISCORD_CHANNEL_ID) return;

  const { id, name, appliedTags } = params;
  store.threads.push({ id, appliedTags, title: name });
}

export async function handleChannelUpdate(
  params: DMChannel | NonThreadGuildBasedChannel,
) {
  if (params.id !== config.DISCORD_CHANNEL_ID) return;

  if (params.type === 15) {
    store.availableTags = params.availableTags;
  }
}

export async function handleThreadUpdate(params: AnyThreadChannel) {
  if (params.parentId !== config.DISCORD_CHANNEL_ID) return;

  const { id, archived, locked } = params.members.thread;
  const thread = store.threads.find((item) => item.id === id);
  if (!thread?.number) return;

  const { number } = thread;
  if (params.archived != archived) {
    archived ? closeIssue(number) : openIssue(number);
  }
  if (params.locked != locked) {
    locked ? lockIssue(number) : unlockIssue(number);
  }
}

export async function handleMessageCreate(params: Message) {
  const { channelId } = params;

  const thread = store.threads.find((thread) => thread.id === channelId);

  if (!thread) return;

  if (!thread.body) {
    createIssue(thread, params);
  } else {
    createIssueComment(thread, params);
  }
}

export async function handleThreadDelete(params: AnyThreadChannel) {
  if (params.parentId !== config.DISCORD_CHANNEL_ID) return;

  const thread = store.threads.find((item) => item.id === params.id);
  if (!thread?.node_id) return;

  deleteIssue(thread.node_id);
}