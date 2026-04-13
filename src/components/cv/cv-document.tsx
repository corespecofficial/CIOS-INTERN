/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, StyleSheet, Image, Link } from "@react-pdf/renderer";

export interface CVData {
  name: string;
  email: string;
  headline: string | null;
  bio: string | null;
  skills: string[];
  interests: string[];
  goals: string | null;
  location: string | null;
  socialLinks: Record<string, string>;
  avatarUrl: string | null;
  level: number;
  xp: number;
  performance: number;
  joined: string;
  certificateCount: number;
  coursesCompleted: number;
}

const styles = StyleSheet.create({
  page: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1F2937",
  },
  /* Left rail */
  rail: {
    width: "32%",
    backgroundColor: "#0A0E1A",
    color: "#E8EDF5",
    padding: 24,
    paddingTop: 36,
  },
  avatarWrap: {
    width: 110, height: 110, borderRadius: 55, alignSelf: "center",
    overflow: "hidden",
    backgroundColor: "#1E88E5",
    marginBottom: 18,
  },
  avatarImage: { width: 110, height: 110 },
  avatarFallback: { fontSize: 36, color: "#fff", textAlign: "center", marginTop: 32, fontFamily: "Helvetica-Bold" },
  railName: { fontSize: 18, color: "#FFFFFF", fontFamily: "Helvetica-Bold", marginTop: 4, textAlign: "center" },
  railRole: { fontSize: 10, color: "#26C6DA", textAlign: "center", marginTop: 4, marginBottom: 22 },

  railSection: { marginTop: 18 },
  railLabel: {
    fontSize: 9, color: "#26C6DA",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)",
  },
  railText: { fontSize: 9.5, color: "#B0BEC5", marginBottom: 3, lineHeight: 1.45 },
  link: { fontSize: 9, color: "#1E88E5", textDecoration: "none" },
  skillTag: {
    fontSize: 9, color: "#FFFFFF",
    backgroundColor: "rgba(30,136,229,0.25)",
    padding: 4, paddingLeft: 8, paddingRight: 8,
    borderRadius: 999,
    marginRight: 4, marginBottom: 4,
  },
  skillRow: { flexDirection: "row", flexWrap: "wrap" },

  /* Right body */
  body: {
    width: "68%",
    padding: 36,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 },
  brand: { fontSize: 9, color: "#1E88E5", fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  certBadge: {
    fontSize: 8, color: "#26C6DA",
    backgroundColor: "rgba(38,198,218,0.12)",
    padding: 4, paddingLeft: 8, paddingRight: 8,
    borderRadius: 4,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  bigName: { fontSize: 30, fontFamily: "Helvetica-Bold", color: "#0F172A", marginBottom: 2 },
  headline: { fontSize: 12, color: "#475569", marginBottom: 18 },

  sectionLabel: {
    fontSize: 9, color: "#1E88E5",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
    marginTop: 14, marginBottom: 6,
  },
  sectionRule: { borderBottomWidth: 1, borderBottomColor: "#E2E8F0", marginBottom: 8 },
  sectionText: { fontSize: 10.5, color: "#1F2937", lineHeight: 1.55, marginBottom: 4 },

  expItem: { marginBottom: 12 },
  expTitle: { fontSize: 11.5, fontFamily: "Helvetica-Bold", color: "#0F172A" },
  expCompany: { fontSize: 10, color: "#475569", marginBottom: 4 },
  expBullet: { fontSize: 10, color: "#334155", marginLeft: 8, marginBottom: 2, lineHeight: 1.5 },

  statsRow: { flexDirection: "row", marginTop: 12, marginBottom: 8 },
  stat: { flex: 1, alignItems: "center", padding: 10, marginRight: 6, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8 },
  statValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1E88E5" },
  statLabel: { fontSize: 8, color: "#64748B", marginTop: 2, letterSpacing: 0.5 },

  footer: { position: "absolute", bottom: 18, left: 36, right: 36, fontSize: 8, color: "#94A3B8", textAlign: "center", borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 6 },
});

function getInitials(name: string) {
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function CVDocument({ data }: { data: CVData }) {
  const joinedYear = new Date(data.joined).getFullYear();
  const links = Object.entries(data.socialLinks || {}).filter(([, v]) => v);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* LEFT RAIL */}
        <View style={styles.rail}>
          <View style={styles.avatarWrap}>
            {data.avatarUrl
              ? <Image src={data.avatarUrl} style={styles.avatarImage} />
              : <Text style={styles.avatarFallback}>{getInitials(data.name)}</Text>}
          </View>
          <Text style={styles.railName}>{data.name}</Text>
          {data.headline && <Text style={styles.railRole}>{data.headline}</Text>}

          <View style={styles.railSection}>
            <Text style={styles.railLabel}>CONTACT</Text>
            <Text style={styles.railText}>{data.email}</Text>
            {data.location && <Text style={styles.railText}>{data.location}</Text>}
          </View>

          {links.length > 0 && (
            <View style={styles.railSection}>
              <Text style={styles.railLabel}>LINKS</Text>
              {links.map(([key, val]) => (
                <Link key={key} src={val.startsWith("http") ? val : `https://${val}`} style={styles.link}>
                  {key}
                </Link>
              ))}
            </View>
          )}

          {data.skills.length > 0 && (
            <View style={styles.railSection}>
              <Text style={styles.railLabel}>SKILLS</Text>
              <View style={styles.skillRow}>
                {data.skills.slice(0, 14).map((s) => (
                  <Text key={s} style={styles.skillTag}>{s}</Text>
                ))}
              </View>
            </View>
          )}

          {data.interests.length > 0 && (
            <View style={styles.railSection}>
              <Text style={styles.railLabel}>INTERESTS</Text>
              <Text style={styles.railText}>{data.interests.join(" · ")}</Text>
            </View>
          )}

          <View style={styles.railSection}>
            <Text style={styles.railLabel}>VERIFIED ON CIOS</Text>
            <Text style={styles.railText}>Certified intern in the COSPRONOS Media × Corespec Engineering AI internship program.</Text>
            <Text style={styles.railText}>Member since {joinedYear}</Text>
          </View>
        </View>

        {/* RIGHT BODY */}
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={styles.brand}>CIOS · CURRICULUM VITAE</Text>
            <Text style={styles.certBadge}>VERIFIED TALENT</Text>
          </View>

          <Text style={styles.bigName}>{data.name}</Text>
          {data.headline && <Text style={styles.headline}>{data.headline}</Text>}

          {data.bio && (
            <>
              <Text style={styles.sectionLabel}>SUMMARY</Text>
              <View style={styles.sectionRule} />
              <Text style={styles.sectionText}>{data.bio}</Text>
            </>
          )}

          {data.goals && (
            <>
              <Text style={styles.sectionLabel}>CAREER OBJECTIVE</Text>
              <View style={styles.sectionRule} />
              <Text style={styles.sectionText}>{data.goals}</Text>
            </>
          )}

          <Text style={styles.sectionLabel}>EXPERIENCE</Text>
          <View style={styles.sectionRule} />
          <View style={styles.expItem}>
            <Text style={styles.expTitle}>CIOS AI Internship Program</Text>
            <Text style={styles.expCompany}>COSPRONOS Media × Corespec Engineering — {joinedYear}–Present</Text>
            <Text style={styles.expBullet}>• Active intern building real-world AI-powered projects on the CIOS platform.</Text>
            <Text style={styles.expBullet}>• Completed {data.coursesCompleted} structured course{data.coursesCompleted === 1 ? "" : "s"} with measurable outcomes.</Text>
            <Text style={styles.expBullet}>• Earned {data.xp.toLocaleString()} XP at level {data.level} (top {Math.max(1, 100 - Math.round(data.performance))}% performance band).</Text>
            <Text style={styles.expBullet}>• Verified track record: attendance, task completion, peer reviews, and shipped projects.</Text>
          </View>

          <Text style={styles.sectionLabel}>VERIFIED PERFORMANCE</Text>
          <View style={styles.sectionRule} />
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{data.level}</Text>
              <Text style={styles.statLabel}>LEVEL</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{data.xp.toLocaleString()}</Text>
              <Text style={styles.statLabel}>XP</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{data.performance}%</Text>
              <Text style={styles.statLabel}>PERF</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{data.certificateCount}</Text>
              <Text style={styles.statLabel}>CERTS</Text>
            </View>
          </View>

          <Text style={styles.footer}>
            Generated by CIOS — verify this profile at https://cios-intern.netlify.app/profile · {new Date().toLocaleDateString()}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
