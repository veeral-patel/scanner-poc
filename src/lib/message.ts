import { GaxiosError } from 'gaxios';
import { gmail_v1 } from 'googleapis';
import VError from 'verror';

// Returns a promise that resolves to (1) the message IDs from the page with the associated page token
// and (2) the page token to use when retrieving our next set of message IDs. [Not testing]
async function getMessageIds(
  gmail: gmail_v1.Gmail,
  pageToken: string | undefined
): Promise<[string[], string | undefined]> {
  // [Error case] Promise fails
  const response = await gmail.users.messages
    .list({
      userId: 'me',
      pageToken,
      includeSpamTrash: true,
    })
    .catch((err: GaxiosError) => {
      const wrappedError = new VError(
        `Failed to get batch of message IDs using page token ${pageToken}: ${err.message}`
      );
      throw wrappedError;
    });

  // Extract the message ID from each message object we receive and store our
  // message IDs into an array
  let messageIds: string[] = [];
  response.data.messages?.forEach(
    (message) => message.id && messageIds.push(message.id)
  );

  // Also extract our next page token from our API response
  let nextPageToken = response.data.nextPageToken || undefined;

  return [messageIds, nextPageToken];
}

// Returns a promise that resolves to a list of all the email message IDs
// in the authenticated user's inbox. [Not testing]

// (Gmail forces us to make separate calls to retrieve the emails associated with each
// message ID.)
export async function getAllMessageIds(
  gmail: gmail_v1.Gmail
): Promise<string[]> {
  let nextPageToken: string | undefined = undefined;
  let firstExecution = true;

  let allMessageIds: string[] = [];

  // Stop requesting the next set of message IDs from Gmail's API once we get an
  // empty next page token from the API
  while (nextPageToken || firstExecution) {
    // Request the next set of message IDs and next page token

    // [Error case] Promise fails
    const [messageIds, newNextPageToken]: [
      string[],
      string | undefined
    ] = await getMessageIds(gmail, nextPageToken).catch((err: Error) => {
      // We intentionally don't wrap the error here as doing so wouldn't add any information
      throw err;
    });

    // Store our received message IDs into our list
    allMessageIds = allMessageIds.concat(messageIds);

    nextPageToken = newNextPageToken;
    firstExecution = false;
  }

  return allMessageIds;
}

// Fetches a message from our API given a message ID. [Not testing]
export async function getMessage(
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<gmail_v1.Schema$Message | null> {
  // [Error case] Promise fails
  const response = await gmail.users.messages
    .get({
      userId: 'me',
      id: messageId,
    })
    .catch((err: GaxiosError) => {
      const wrappedError = new VError(
        `Failed to get the message with ID ${messageId}: ${err.message}`
      );
      throw wrappedError;
    });

  return response.data;
}
