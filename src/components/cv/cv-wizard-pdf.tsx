/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, StyleSheet, Image, Link } from "@react-pdf/renderer";
import type { CvFormPayload, CvPolished } from "@/app/actions/cv-builder";
import { getRegion } from "@/lib/cv-standards";

interface Props {
  payload: CvFormPayload;
  polished: CvPolished;
}

// ATS-safe single-column "Standard" template — works across every region.
// Respects regional conventions: photo / DOB / nationality / referees only render
// when the selected region allows/requires them.
export function CvWizardPdf({ payload, polished }: Props) {
  const region = getRegion(payload.region);
  const showPhoto = !!payload.photoUrl && region?.photo !== "forbidden";
  const showDob = !!payload.dob && !!region?.includesDob;
  const showNationality = !!payload.nationality && !!region?.includesNationality;
  const showMarital = !!payload.maritalStatus && !!region?.includesMaritalStatus;
  const showState = !!payload.stateOfOrigin && !!region?.includesStateOfOrigin;
  const showNysc = !!payload.nyscStatus && !!region?.requiresNysc;

  return (
    <Document title={`${payload.fullName} CV`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {showPhoto && (
            <View style={styles.photoWrap}>
              <Image src={payload.photoUrl} style={styles.photo} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{payload.fullName}</Text>
            {payload.headline ? <Text style={styles.headline}>{payload.headline}</Text> : null}
            <Text style={styles.contact}>
              {[payload.email, payload.phone, payload.location].filter(Boolean).join("  ·  ")}
            </Text>
            {payload.links.length > 0 && (
              <View style={styles.linkRow}>
                {payload.links.filter((l) => l.url).map((l, i) => (
                  <Link key={i} src={l.url} style={styles.link}>{l.label || l.url}</Link>
                ))}
              </View>
            )}
            <Text style={styles.meta}>
              {[
                showDob ? `DOB: ${payload.dob}` : null,
                showNationality ? payload.nationality : null,
                showMarital ? payload.maritalStatus : null,
                showState ? `State of origin: ${payload.stateOfOrigin}` : null,
                showNysc ? `NYSC: ${payload.nyscStatus}` : null,
              ].filter(Boolean).join("  ·  ")}
            </Text>
          </View>
        </View>

        {/* Summary / Personal statement */}
        {polished.summary ? (
          <Section title={region?.requiresPersonalStatement ? "Personal statement" : "Summary"}>
            <Text style={styles.body}>{polished.summary}</Text>
          </Section>
        ) : null}

        {/* Experience */}
        {polished.experience.length > 0 && (
          <Section title="Experience">
            {polished.experience.map((x, i) => (
              <View key={i} style={styles.expItem}>
                <View style={styles.expHeaderRow}>
                  <Text style={styles.expRole}>{x.role}</Text>
                  <Text style={styles.expPeriod}>{x.startDate} — {x.endDate}</Text>
                </View>
                <Text style={styles.expCompany}>{[x.company, x.location].filter(Boolean).join(" · ")}</Text>
                {x.bullets.map((b, j) => (
                  <Text key={j} style={styles.bullet}>• {b}</Text>
                ))}
              </View>
            ))}
          </Section>
        )}

        {/* Education */}
        {payload.education.length > 0 && (
          <Section title="Education">
            {payload.education.map((e, i) => (
              <View key={i} style={styles.expItem}>
                <View style={styles.expHeaderRow}>
                  <Text style={styles.expRole}>{e.qualification}</Text>
                  <Text style={styles.expPeriod}>{e.startDate} — {e.endDate}</Text>
                </View>
                <Text style={styles.expCompany}>
                  {[e.institution, e.location, e.grade].filter(Boolean).join(" · ")}
                </Text>
              </View>
            ))}
          </Section>
        )}

        {/* Skills grouped */}
        {polished.skillsGrouped.length > 0 && (
          <Section title="Skills">
            {polished.skillsGrouped.map((g, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <Text style={styles.skillGroup}>{g.group}</Text>
                <Text style={styles.skillItems}>{g.items.join(" · ")}</Text>
              </View>
            ))}
          </Section>
        )}

        {/* Languages */}
        {payload.languages.length > 0 && (
          <Section title="Languages">
            {payload.languages.map((l, i) => (
              <Text key={i} style={styles.bullet}>
                • {l.name}{l.level ? ` — ${l.level}` : ""}
              </Text>
            ))}
          </Section>
        )}

        {/* Certifications */}
        {payload.certifications.length > 0 && (
          <Section title="Certifications">
            {payload.certifications.map((c, i) => (
              <Text key={i} style={styles.bullet}>• {c}</Text>
            ))}
          </Section>
        )}

        {/* Interests (UK/European/African) */}
        {payload.interests.length > 0 && region?.allowsInterests && (
          <Section title="Interests">
            <Text style={styles.body}>{payload.interests.join(" · ")}</Text>
          </Section>
        )}

        {/* Projects */}
        {payload.projects.length > 0 && (
          <Section title="Projects">
            {payload.projects.map((p, i) => (
              <View key={i} style={styles.expItem}>
                <Text style={styles.expRole}>
                  {p.name}
                  {p.url ? (
                    <>
                      {"  "}
                      <Link src={p.url} style={styles.link}>{p.url}</Link>
                    </>
                  ) : null}
                </Text>
                <Text style={styles.body}>{p.blurb}</Text>
              </View>
            ))}
          </Section>
        )}

        {/* Referees — only when region requires/allows them */}
        {payload.referees.length > 0 && region?.requiresReferees && (
          <Section title="Referees">
            {payload.referees.map((r, i) => (
              <View key={i} style={styles.expItem}>
                <Text style={styles.expRole}>{r.name}{r.title ? ` — ${r.title}` : ""}</Text>
                <Text style={styles.expCompany}>
                  {[r.organisation, r.email, r.phone].filter(Boolean).join(" · ")}
                </Text>
              </View>
            ))}
          </Section>
        )}

        <Text style={styles.footer} render={({ pageNumber, totalPages }) =>
          `${payload.fullName}  ·  Page ${pageNumber} of ${totalPages}  ·  Built with CIOS`
        } fixed />
      </Page>
    </Document>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionRule} />
      {children}
    </View>
  );
}

const ACCENT = "#EC4899";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1F2937",
  },
  header: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 18,
  },
  photoWrap: {
    width: 78, height: 78, borderRadius: 39,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  photo: { width: 78, height: 78, objectFit: "cover" },
  name: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#111827", marginBottom: 2 },
  headline: { fontSize: 12, color: ACCENT, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  contact: { fontSize: 9.5, color: "#374151", marginBottom: 3 },
  linkRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 2 },
  link: { fontSize: 9, color: ACCENT, textDecoration: "none" },
  meta: { fontSize: 9, color: "#6B7280", marginTop: 4 },

  section: { marginTop: 14 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  sectionRule: {
    height: 1, backgroundColor: "#E5E7EB", marginTop: 3, marginBottom: 8,
  },

  expItem: { marginBottom: 10 },
  expHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  expRole: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#111827" },
  expPeriod: { fontSize: 9, color: "#6B7280" },
  expCompany: { fontSize: 10, color: "#374151", marginTop: 2, marginBottom: 4 },
  bullet: { fontSize: 10, color: "#1F2937", lineHeight: 1.55, marginBottom: 2 },
  body: { fontSize: 10, color: "#1F2937", lineHeight: 1.55 },

  skillGroup: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111827" },
  skillItems: { fontSize: 10, color: "#374151", marginTop: 2, lineHeight: 1.5 },

  footer: {
    position: "absolute",
    bottom: 18, left: 36, right: 36,
    textAlign: "center",
    fontSize: 8,
    color: "#9CA3AF",
  },
});
