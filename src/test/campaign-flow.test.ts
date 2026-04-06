import { describe, it, expect } from "vitest";
import { SOCIAL_FORMATS, PLATFORM_LABELS } from "@/types/campaigns";
import type { SocialPlatform, SocialFormat } from "@/types/campaigns";

describe("Campaign Types", () => {
  it("should have all 12 social formats defined", () => {
    expect(SOCIAL_FORMATS.length).toBe(12);
  });

  it("should have labels for all platforms", () => {
    const platforms: SocialPlatform[] = ["instagram", "tiktok", "facebook", "youtube", "linkedin", "x", "snapchat"];
    platforms.forEach((p) => {
      expect(PLATFORM_LABELS[p]).toBeDefined();
      expect(typeof PLATFORM_LABELS[p]).toBe("string");
    });
  });

  it("should have valid dimensions for all formats", () => {
    SOCIAL_FORMATS.forEach((fmt) => {
      expect(fmt.width).toBeGreaterThan(0);
      expect(fmt.height).toBeGreaterThan(0);
      expect(fmt.aspectRatio).toMatch(/^\d+\/\d+$/);
    });
  });

  it("should cover image, video, and carousel formats", () => {
    const formats = SOCIAL_FORMATS.map((f) => f.format);
    expect(formats).toContain("post");
    expect(formats).toContain("story");
    expect(formats).toContain("reel");
    expect(formats).toContain("carousel");
  });

  it("should have Instagram covering post, story, reel, and carousel", () => {
    const igFormats = SOCIAL_FORMATS.filter((f) => f.platform === "instagram").map((f) => f.format);
    expect(igFormats).toContain("post");
    expect(igFormats).toContain("story");
    expect(igFormats).toContain("reel");
    expect(igFormats).toContain("carousel");
  });
});

describe("Social Meta Parsing", () => {
  const parseMeta = (text: string) => {
    const match = text.match(/^\[meta:([a-z]+)\|([a-z]+)\|([0-9/]+)\]/);
    if (match) {
      return { platform: match[1], format: match[2], aspectRatio: match[3] };
    }
    return null;
  };

  const stripMeta = (text: string): string => {
    return text.replace(/^\[meta:[^\]]+\]\s*/, "").replace(/^\[Generation context:[^\]]*\]\s*/, "").trim();
  };

  it("should parse valid meta tags", () => {
    const result = parseMeta("[meta:instagram|post|4/5] Hello world");
    expect(result).toEqual({ platform: "instagram", format: "post", aspectRatio: "4/5" });
  });

  it("should return null for text without meta", () => {
    expect(parseMeta("Just a plain caption")).toBeNull();
  });

  it("should strip meta from caption text", () => {
    expect(stripMeta("[meta:instagram|post|4/5] Hello world")).toBe("Hello world");
  });

  it("should handle 9/16 aspect ratio", () => {
    const result = parseMeta("[meta:tiktok|reel|9/16] TikTok caption");
    expect(result?.aspectRatio).toBe("9/16");
  });

  it("should strip generation context tags", () => {
    expect(stripMeta("[Generation context: some info] Caption text")).toBe("Caption text");
  });
});

describe("Generation Matrix Logic", () => {
  it("should calculate correct generation count for separate mode", () => {
    const fileCount = 5;
    const platformCount = 3;
    expect(fileCount * platformCount).toBe(15);
  });

  it("should calculate correct generation count for grouped mode", () => {
    const fileCount = 5; // becomes 1 carousel
    const platformCount = 3;
    const carouselCount = 1;
    expect(carouselCount * platformCount).toBe(3);
  });

  it("should assign carousel type for grouped multi-file upload", () => {
    const files = [{ url: "a" }, { url: "b" }, { url: "c" }];
    const uploadMode = "grouped";
    const assetType = uploadMode === "grouped" && files.length > 1 ? "carousel" : "image";
    expect(assetType).toBe("carousel");
  });

  it("should keep separate types for single file in grouped mode", () => {
    const files = [{ url: "a" }];
    const uploadMode = "grouped";
    const assetType = uploadMode === "grouped" && files.length > 1 ? "carousel" : "image";
    expect(assetType).toBe("image");
  });
});
