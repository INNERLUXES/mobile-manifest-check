# Security

## Reporting a problem

Write to info@innerluxes.dev with the subject line "mobile-manifest-check security", or use private vulnerability
reporting on this repository. Please do not open a public issue for a vulnerability.

Include a small made-up manifest, resource, Info.plist or configuration that shows the problem, the command you ran,
what you expected and what happened. Use made-up apps and names, never the files of a real product, and never a real
key, token or password, even a revoked one.

## Scope

In scope:

- an input that makes the tool read a file other than the files, the resources next to a manifest and the
  configuration it was given, follow a symbolic link, or read a file a pattern of the configuration leaves out
- an input that makes the tool expand a declared entity, load or fetch a document type, open a network connection,
  run a program or evaluate any part of a file
- an input that makes the tool write a file
- an input that makes the tool hang, take very long or use unbounded memory, such as a very large file, very many
  files, entities that expand into each other, long runs of brackets, ampersands, quotes or comment openers, or markup
  very deep or very wide
- binary, UTF-16 or invalid UTF-8 input, or a binary property list, that the tool reads as if it were text
- an input that the tool fails to read and passes over without an error finding
- a run that passes at a `failOn` level although a file it read holds a finding at that level that docs/method.md says
  is reported
- text from a file or a file name that rewrites the terminal through control or direction characters, starts or ends
  a GitHub workflow command, or is shown unescaped in the output
- a name such as `__proto__` that changes how objects behave inside the tool

Out of scope: the forms docs/limits.md says the tool does not read, whether the app is secure in what its code does,
the libraries an app bundles and the manifests they merge in, who may change the files or the configuration in your
repository, and where your pipeline keeps the output.

Read [docs/threat-model.md](docs/threat-model.md) for the rest.
