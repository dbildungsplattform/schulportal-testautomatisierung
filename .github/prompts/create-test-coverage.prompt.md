Please review the test coverage for the following case:  
The items to be tested are listed in `test_coverage\testgegenstand.md`,  
the tests can be found in the `tests` folder.

Read the contents of the relevant test files — not just their file names.  
Check whether the test item appears as a standalone `describe`/test block  
or is only implicitly covered as a step within another test.

Use the following statuses:

*   ✅ Fully covered: directly and completely tested, all user groups considered
*   ⚠️ Partially covered: implicit, only some user groups covered, or only as a side effect of another test
*   ❌ Not covered: no test exists

Create a Markdown table with the columns:  
No. | Test item | User group(s) | Status | Test file(s) | Notes

In the “Notes” column, briefly explain why you assigned that status,  
especially for ⚠️ and ❌.

Write the result to `test_coverage\testabdeckung.md`.  
At the end, add a summary with: total count, ✅, ⚠️, ❌.