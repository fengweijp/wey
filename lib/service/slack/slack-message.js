const User = require('../../model/user')
const Message = require('../../model/message')
const SlackAttachment = require('./slack-attachment')
const SlackReaction = require('./slack-reaction')
const SlackUser = require('./slack-user')

const {slackMarkdownToHtml} = require('./message-parser')

class SlackMessage extends Message {
  constructor(account, event) {
    let userId = event.user
    let timestamp = event.ts
    switch (event.subtype) {
      case 'file_comment':
        timestamp = event.comment.timestamp
        userId = event.comment.user
        break
      case 'bot_message':
        userId = event.bot_id
        break
    }
    super(timestamp, event.text, timestamp)
    switch (event.subtype) {
      case 'file_comment':
        this.isSub = true
        break
      case 'bot_message':
        this.isBot = true
        break
    }
    if (event.attachments)
      this.attachments = event.attachments.map((att) => new SlackAttachment(account, att))
    if (event.edited && !this.isBot)
      this.isEdited = true
    if (event.reactions)
      this.reactions = event.reactions.map((r) => new SlackReaction(account, r.name, r.count))
    this.user = account.findUserById(userId)
    if (!this.user) {
      this.user = new User(userId, '<unkown>', '')
      this.pendingUser = userId
    }
  }

  async fetchPendingInfo(account) {
    if (this.text)
      this.text = await slackMarkdownToHtml(account, this.text)
    if (this.pendingUser) {
      this.user = await account.fetchUser(this.pendingUser, this.isBot)
      delete this.pendingUser
    }
  }
}

module.exports = SlackMessage
