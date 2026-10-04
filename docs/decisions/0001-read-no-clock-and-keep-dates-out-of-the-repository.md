# 1. Read no clock, and keep dates out of the repository

## Status

Accepted

## Context

A release check is tempting to tie to the calendar: a store deadline after which a target API level becomes an error,
a grace period for a permission until a declaration is approved, a report that says how long a setting has been in the
manifest. Each of these would make the same files give a different result on a different day, so a pipeline that
passed yesterday could fail today with no change to the repository, and two people checking the same commit could see
two answers. The output could never be saved and compared.

The checks do not need a date. Whether an app is debuggable, which permissions it requests, whether cleartext is
allowed and whether a usage description is empty can all be read from the files as they are. A deadline of a store
belongs to the team that publishes the app, in a commit of its own.

## Decision

1. The tool reads no clock, no time zone and no locale. The same files and configuration give the same output on
   every machine and on every day.
2. The configuration has no key that holds a date. A team that wants a deadline raises `failOn` or a rule in a commit
   of its own, where the change can be reviewed.
3. No file of this repository holds a date or a number that reads like a year: not the licence, not the changelog,
   not the examples, not the documents, not the comments of the code. `npm run check` and a test fail on any number
   that reads like a year. Version numbers and API levels such as Android 12, API level 28, iOS 10, TLS 1.2 or Node 22
   are not years and are fine.

## Consequences

- The output of a run can be saved in the repository (`examples/output`) and compared on every change, because it
  does not move with the calendar.
- A store policy that starts on a given day is described by what it asks for, with the page that says so, and not by
  the day; the team decides when to raise a rule.
- The README, the documents and the examples can be read at any time without being out of date about a date.
