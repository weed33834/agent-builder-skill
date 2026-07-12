"""结论生成 v2 —— 多句结论,带画像标签与行为风格。"""


def build_summary(assessment_type: str, dimensions: dict, matches: list[dict]) -> str:
    """生成 2-3 句结论,中性措辞,带具体维度与匹配。"""
    if assessment_type == "celebrity":
        return _celebrity_summary(dimensions, matches)
    if assessment_type == "value":
        return _value_summary(dimensions, matches)
    if assessment_type == "ideology":
        return _ideology_summary(dimensions, matches)
    return "你的心镜映出:一个独特的你。"


def _celebrity_summary(dimensions: dict, matches: list[dict]) -> str:
    if not matches:
        return "你的心镜映出:一个独特的人格组合,难以归入任何既有的名字。"
    top = matches[0]
    # 找最突出的维度
    if dimensions:
        top_dim = max(dimensions, key=lambda k: dimensions[k])
        dim_names = {
            "openness": "开放性", "conscientiousness": "尽责性", "extraversion": "外向性",
            "agreeableness": "宜人性", "neuroticism": "敏感度", "risk_taking": "风险偏好",
            "idealism": "理想主义",
        }
        dim_label = dim_names.get(top_dim, top_dim)
        return f"你的心镜映出:与{top['name']}最相近,匹配度 {top['match_pct']}%。{top['blurb']}。你最突出的特质是{dim_label}({dimensions[top_dim]})。"
    return f"你的心镜映出:与{top['name']}最相近,匹配度 {top['match_pct']}%。{top['blurb']}。"


def _value_summary(dimensions: dict, matches: list[dict]) -> str:
    if not matches:
        return "你的心镜映出:一个独特的价值结构。"
    tier = matches[0]["name"].split(":", 1)[-1] if ":" in matches[0]["name"] else matches[0]["name"]
    vtype = matches[1]["name"].split(":", 1)[-1] if len(matches) > 1 and ":" in matches[1]["name"] else "多元"
    # 道德水平数值
    moral_score = matches[0].get("match_pct", 0)
    return f"你的心镜映出:{tier}、{vtype}。道德倾向得分 {moral_score},价值优先级清晰。{matches[0]['blurb']}。"


def _ideology_summary(dimensions: dict, matches: list[dict]) -> str:
    if not matches:
        return "你的心镜映出:一个独特的政治坐标,难以归入任何既有标签。"
    top = matches[0]
    # 算经济轴与社会轴位置
    econ = 50 + (dimensions.get("econ_right", 50) - dimensions.get("econ_left", 50)) / 2
    social = 50 + (dimensions.get("authority", 50) - dimensions.get("liberty", 50)) / 2
    econ_label = "偏左" if econ < 40 else "偏右" if econ > 60 else "中立"
    social_label = "偏自由" if social < 40 else "偏权威" if social > 60 else "中立"
    return f"你的心镜映出:意识形态最接近{top['name']}(匹配 {top['match_pct']}%)。经济轴{econ_label}({econ:.0f}),社会轴{social_label}({social:.0f})。{top['blurb']}。"
