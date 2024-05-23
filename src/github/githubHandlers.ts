import { Request } from "express";
import {
  addThreadTag,
  archiveThread,
  createComment,
  createThread,
  deleteThread,
  getThreadChannel,
  lockThread,
  removeThreadTag,
  unarchiveThread,
  unlockThread,
} from "../discord/discordActions";
import { GitHubLabel } from "../interfaces";
import { store } from "../store";
import { getDiscordInfoFromGithubBody } from "./githubActions";
import { config } from "../config";

async function getIssueNodeId(req: Request): Promise<string | undefined> {
  return req.body.issue.node_id;
}

export async function handleOpened(req: Request) {
  if (!req.body.issue) return;
  const { node_id, number, title, user, body, labels } = req.body.issue;
  if (store.threads.some((thread) => thread.node_id === node_id)) {
    const { thread, channel } = await getThreadChannel(node_id);
    const name = channel?.name;
    const new_name = `#${number}: ${name}`;
    if (new_name.length <= 100) {
      channel?.setName(new_name);
    }
    
    channel?.send(`GitHub Issue: <${req.body.issue.html_url}>\nThank you for your report!`);
    return;
  }

  const { login } = user;
  const appliedTags = (<GitHubLabel[]>labels)
    .map(
      (label) =>
        store.availableTags.find((tag) => tag.name === label.name)?.id || "",
    )
    .filter((i) => i);

  createThread({ login, appliedTags, number, title, body, node_id });
}

export async function handleCreated(req: Request) {
  if (!req.body.comment) return;
  const { user, id, body } = req.body.comment;
  const { login, avatar_url } = user;
  const { node_id } = req.body.issue;

  // Check if the comment already contains Discord info
  if (getDiscordInfoFromGithubBody(body).channelId) {
    // If it does, stop processing (assuming created with a bot)
    return;
  }

  createComment({
    git_id: id,
    body,
    login,
    avatar_url,
    node_id,
  });
}

export async function handleClosed(req: Request) {
  const node_id = await getIssueNodeId(req);
  archiveThread(node_id);
}

export async function handleReopened(req: Request) {
  const node_id = await getIssueNodeId(req);
  unarchiveThread(node_id);
}

export async function handleLocked(req: Request) {
  const node_id = await getIssueNodeId(req);
  lockThread(node_id);
}

export async function handleUnlocked(req: Request) {
  const node_id = await getIssueNodeId(req);
  unlockThread(node_id);
}

export async function handleDeleted(req: Request) {
  const node_id = await getIssueNodeId(req);
  deleteThread(node_id);
}

export async function handleLabeled(req: Request) {
  const tag = store.availableTags.find((tag) => tag.name === req.body.label.name)?.id;
  const node_id = await getIssueNodeId(req);
  addThreadTag(node_id, tag);
}

export async function handleUnlabeled(req: Request) {
  const tag = store.availableTags.find((tag) => tag.name === req.body.label.name)?.id;
  const node_id = await getIssueNodeId(req);
  removeThreadTag(node_id, tag);
}