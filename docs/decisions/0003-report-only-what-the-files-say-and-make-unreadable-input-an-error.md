# 3. Report only what the files say, and make unreadable input an error

## Status

Accepted

## Context

A release check is used to decide whether an app can ship. Two things make it useless: a finding that is a guess,
because a team that sees false alarms stops reading the report, and a file that was passed over in silence, because a
pass then means nothing. Both are easy to fall into with mobile apps. Much of what decides the real behaviour of an app
is outside the files: the merged manifest of a build, the target API level in Gradle, a build setting in Xcode, a
library that adds a permission, the code that calls the camera. A tool that guessed at these would be wrong in both
directions.

At the same time, not every setting is a mistake. A dangerous permission may be what the app is for, and a usage
description is how it should be. A team needs the list, not a red pipeline for every permission.

## Decision

1. Only what is written in the files is reported: an attribute with a literal value, a key in the Info.plist, an
   element in a resource. A value that is a resource reference, a placeholder or a build setting is not resolved and
   not guessed; docs/limits.md lists what the tool cannot see.
2. Findings have three levels. Settings that ship a broken or open app are errors; settings that loosen a protection
   are warnings; the inventory of permissions, usage descriptions and shared files is info. The run fails on findings
   at or above `failOn`, `error` by default.
3. A file that cannot be read, or that the XML reader refuses, is reported, never skipped in silence, and the two rules
   of input problems cannot be lowered or set off. The rest of the input is still read, so one broken file does not
   hide the findings of the others; a path that cannot be used at all stops the run with exit code `2`.
4. A resource the manifest names and the tool cannot find is a warning of its own (`missing-resource`), so a network
   security config that was not checked is never mistaken for one that is clean.
5. Every rule names the OWASP MASVS controls it supports. A finding helps with a control; neither a finding nor a clean
   run says that an app meets one.

## Consequences

- With the defaults the check runs in a pipeline without failing on the inventory it lists, and fails on the settings
  that should never ship and when its own input cannot be trusted.
- A team that wants every risky setting to fail sets `failOn` to `warning`, and can raise a single rule to `error`.
- Some real problems are out of reach of a file check, and every report says so in its last sentence before the result.
