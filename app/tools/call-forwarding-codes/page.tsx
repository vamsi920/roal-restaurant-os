import { ToolPageFrame, toolUrl } from "@/components/seo/tools/tool-page-frame";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

const SLUG = "call-forwarding-codes";
const TITLE = "Call Forwarding Codes by Carrier for Restaurants";
const DESCRIPTION =
  "Call forwarding codes by carrier for restaurant phones: forward all calls, busy or no answer, and cancel. Includes landline, mobile and VoIP steps.";

export const metadata = buildPublicPageMetadata({ title: TITLE, description: DESCRIPTION, canonicalPath: `/tools/${SLUG}` });

type Row = { line: string; carriers: string; codes: { label: string; code: string }[] };

const ROWS: Row[] = [
  {
    line: "Many landlines",
    carriers: "Including Verizon and AT&T landlines",
    codes: [
      { label: "Forward all calls", code: "*72 + number" },
      { label: "Cancel", code: "*73" },
    ],
  },
  {
    line: "GSM mobile",
    carriers: "AT&T, T-Mobile",
    codes: [
      { label: "Forward all calls", code: "**21*number#" },
      { label: "Cancel forward all", code: "##21#" },
      { label: "Forward when no answer", code: "**61*number#" },
      { label: "Forward when busy", code: "**67*number#" },
      { label: "Cancel all forwarding", code: "##002#" },
    ],
  },
  {
    line: "Verizon Wireless",
    carriers: "Verizon mobile phones",
    codes: [
      { label: "Forward all calls", code: "*72 + number" },
      { label: "Cancel", code: "*73" },
      { label: "Forward when busy or no answer", code: "*71 + number" },
    ],
  },
  {
    line: "Business cable and internet phone lines",
    carriers: "Comcast Business, Spectrum Business, Optimum Business, RingCentral, Google Voice and most internet phone services",
    codes: [
      {
        label: "Forwarding",
        code: "Set it in the online portal or app",
      },
    ],
  },
];

const TEST_STEPS = [
  "Turn forwarding on from the restaurant phone, using the code or the online portal.",
  "Listen for the confirmation tone or message, or check the setting shows as on in the portal.",
  "From a different phone, like a personal cell, call the restaurant number.",
  "Check the call reaches the new number and the caller hears the right greeting.",
  "If you set busy or no-answer forwarding, test that too: let it ring out once, and call while the line is in use.",
  "Write down the cancel code and keep it by the phone so anyone on staff can switch it back.",
];

const FAQS = [
  {
    id: "codes-differ",
    question: "Why didn't the code work on my line?",
    answer:
      "Forwarding codes vary by carrier and plan, and some plans need forwarding added first. Call your carrier to confirm the right code for your line, then place a test call.",
  },
  {
    id: "number-format",
    question: "How do I enter the number to forward to?",
    answer:
      "Usually the full 10-digit number, with no spaces or dashes. On mobile codes it goes where the word number is, before the #. Some carriers want a 1 in front.",
  },
  {
    id: "keep-number",
    question: "Do I keep my restaurant phone number?",
    answer:
      "Yes. Forwarding sends calls from your existing number to another one. Your customers keep dialing the number they already know.",
  },
  {
    id: "forward-to-roal",
    question: "Can I forward my restaurant line to ROAL?",
    answer:
      "Yes. Your restaurant line can forward to your ROAL phone host all the time, or only when busy or unanswered. Build a free test host first and call it to hear how it sounds.",
  },
];

export default function Page() {
  return (
    <ToolPageFrame
      slug={SLUG}
      title="Call forwarding codes for your restaurant phone"
      lead="The common codes to forward your restaurant line, forward only when busy or unanswered, and turn it back off."
      aeo={{
        question: "How do I forward my restaurant phone calls?",
        answer:
          "On many landlines you dial *72 and the new number, and *73 to cancel. On many mobile lines it is **21*number# and ##21# to cancel. Codes vary by carrier and plan, so confirm with your carrier and always place a test call.",
      }}
      howTitle="How to test call forwarding"
      how={
        <>
          <ol className="list-decimal pl-5 grid gap-1.5">
            {TEST_STEPS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="mt-4">
            Codes vary by carrier and plan. If something doesn&apos;t work, confirm the right code with your carrier and
            place another test call before a busy shift.
          </p>
        </>
      }
      faqs={FAQS}
      relatedTools={["phone-greeting-templates", "missed-call-calculator"]}
      relatedPages={["/use-cases/rush-hour", "/compare/answering-service"]}
      pageJsonLd={{
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: "How to forward and test restaurant phone calls",
        description: DESCRIPTION,
        url: toolUrl(`/tools/${SLUG}`),
        step: TEST_STEPS.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })),
      }}
      extra={
        <section className="section" aria-labelledby="forward-busy-title">
          <div className="wrap">
            <div className="prose-card reveal">
              <div className="prose">
                <h2 id="forward-busy-title">Forward only when busy or unanswered</h2>
                <p>
                  You don&apos;t have to send every call away. Many lines can forward only when the phone is busy or
                  rings without an answer. Your staff still pick up when they can, and the overflow goes to the
                  number you choose.
                </p>
                <p>
                  On GSM mobile lines, **61*number# forwards unanswered calls and **67*number# forwards when busy. On
                  Verizon Wireless, *71 + number covers both. Internet phone services usually have a busy or
                  no-answer option in the online portal or app. Some landline plans offer it too, so ask your carrier.
                </p>
              </div>
            </div>
          </div>
        </section>
      }
    >
      <div className="tool-card">
        <p className="tool-card__note">
          Codes vary by carrier and plan. Confirm with your carrier, and always place a test call.
        </p>
        <div className="tool-table-wrap">
          <table className="tool-table">
            <thead>
              <tr>
                <th scope="col">Line type</th>
                <th scope="col">What to dial</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.line}>
                  <td>
                    {row.line}
                    <span className="block text-sm font-normal text-muted">{row.carriers}</span>
                  </td>
                  <td>
                    <ul className="grid gap-1.5">
                      {row.codes.map((c) => (
                        <li key={c.label}>
                          {c.label}: <code>{c.code}</code>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tool-summary">
          For business cable and internet phone lines, sign in to your account online or open the provider&apos;s app,
          find the call forwarding setting for your restaurant number, and enter the number to forward to. Most also
          let you choose all calls, busy, or no answer.
        </p>
      </div>
    </ToolPageFrame>
  );
}
