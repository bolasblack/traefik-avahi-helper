import { matchDomainCNames, traefikRouterRuleRe } from "./regexHelpers";

const testValues = [
  "Host(`example.local`)",
  "Host(`foo.example.local`) || Host(`bar.example.local`)",
  "HOST(`foo.example.local`) || ( Host(`baz.example.local`) && Path(`/baz`) )",
  "Host(`bill.example.local`) || ( Path(`/ben`) && Host(`ben.example.local`) )",
  "Host( `foo.local`, `bar.local`)",
  "Host(`example.com`)",
  "Host(`foo.example.com`) || Host(`bar.example.local`)",
  "HOST(`foo.example.local`) || ( Host(`baz.example.com`) && Path(`/baz`) )",
  "Host(`bill.example.com`) || ( Path(`/ben`) && Host(`ben.example.local`) )",
  "Host( `foo.com`, `bar.local`)",
];

testValues.forEach((l) => {
  if (traefikRouterRuleRe.test(l)) {
    traefikRouterRuleRe.lastIndex = 0;
    console.log(matchDomainCNames(l));
  } else {
    console.log("no match - " + l);
  }
});
