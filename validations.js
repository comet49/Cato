class Validate {
  static async parseMsg(msg, admins) {
    // Prepare message content by removing command
    const content = msg.content.replace(/^\S+\s+/, '');

    // Make sure entire message is correct format
    if (!content.match(/^([\s,-]*<@!?\d+>\s+\d+[\s,-]*){3,4}/)) return { success : 0, error : 'Match report is an invalid format (Common errors include improperly tagged Discord members, invalid match scores or configurations)' };

    // Parse content into pairs of user ID and raw text scores
    const parsed = content.match(/<@!?\d+>\s+\d+/g).map(p => p.match(/<@!?(\d+)>\s+(\d+)/)).map(([, userId, rawScore]) => [userId, rawScore]);

    // Ensure no duplicate entries exist and verify all users
    const checkedUsers = new Set();
    for (const [userId] of parsed) {
      const member = await msg.guild.fetchMember(userId);
      if (member === null || member === undefined) return { success : 0, error : `${userId} is not a valid user ID` };
      if (checkedUsers.has(userId)) return { success : 0, error : `${member.displayName} is listed twice` };

      checkedUsers.add(userId);
    }

    // Audit tagged members
    const taggedUserIds = msg.mentions.users.keyArray();
    if (!taggedUserIds.includes(msg.author.id) && !admins.includes(msg.author.id)) return { success : 0, error : 'You must submit a match you participated in' };
    if (taggedUserIds.length < 3) return { success : 0, error : 'Tag at least three members' };
    if (taggedUserIds.length > 4) return { success : 0, error : 'Cannot tag more than 4' };

    // Generate fields from text, iterating pairs of tags and scores, and parsing them
    const fields = await Promise.all(parsed.map(async ([userId, rawScore]) => ({
      userId,
      score    : parseInt(rawScore, 10),
      username : (await msg.guild.fetchMember(userId)).displayName,
    })));

    // Make sure no users have invalid scores
    const NaNField = fields.find(f => Number.isNaN(f.score));
    if (NaNField !== undefined) return { success : 0, error : `${NaNField.username}'s score is not a valid number` };

    // Ensure only 1 user can have a highscore
    const highscoreFields = fields.filter(f => f.score >= 10);
    if (highscoreFields.length > 1) return { success : 0, error : 'There cannot be 2 highscores' };
    if (highscoreFields.length < 1) return { success : 0, error : 'At least one player must have 10 or 11 points' };

    // Make sure no scores are too low
    const lowScoreField = fields.find(f => f.score < 2);
    if (lowScoreField !== undefined) return { success : 0, error : `${lowScoreField.username}'s score is too low. The minimum points is 2` };

    // Make sure scores are too high (high scores not highscores)
    const highScoreField = fields.find(f => f.score > 11);
    if (highScoreField !== undefined) return { success : 0, error : `${highScoreField.username}'s score is too high, the maximum points is 11` };

    // Return data with score-sorted fields in decending
    return {
      success : 1,
      data    : {
        fields   : fields.sort((a, b) => b.score - a.score),
        gameId   : msg.id,
        date     : new Date(),
      },
    };
  }

  static reactionValidation(reaction, user) {
    // Disregard attemped self validation
    if (reaction.message.author.id === user.id) return false;

    // Disregard if not mentioned
    if (!reaction.message.mentions.users.get(user.id)) return false;

    // Mentioned and not author, returning valid
    return true;
  }
}

module.exports = Validate;
