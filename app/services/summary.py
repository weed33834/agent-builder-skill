"""一句话结论生成 —— 按测评类型选模板。"""


def build_summary(assessment_type: str, dimensions: dict, matches: list[dict]) -> str:
    """生成一句话结论,中性措辞,不评判。"""
    if assessment_type == "celebrity":
        if matches:
            top = matches[0]
            return f"你的心镜映出:与{top['name']}最相近,匹配度 {top['match_pct']}%。{top['blurb']}。"
        return "你的心镜映出:一个独特的人格组合。"

    if assessment_type == "value":
        if matches:
            tier = matches[0]["name"].split(":", 1)[-1]
            vtype = matches[1]["name"].split(":", 1)[-1] if len(matches) > 1 else "多元"
            return f"你的心镜映出:{tier}、{vtype}。道德倾向稳定,价值优先级清晰。"
        return "你的心镜映出:一个独特的价值结构。"

    if assessment_type == "ideology":
        if matches:
            top = matches[0]
            return f"你的心镜映出:意识形态最接近{top['name']}。{top['blurb']}。"
        return "你的心镜映出:一个独特的政治坐标。"

    return "你的心镜映出:一个独特的你。"
