"""结论生成 v3 —— 有作者腔的短句,去模板化。"""


def build_summary(assessment_type: str, dimensions: dict, matches: list[dict]) -> str:
    """生成 1-2 句结论,克制且有辨识度。"""
    if assessment_type == "celebrity":
        return _celebrity_summary(dimensions, matches)
    if assessment_type == "value":
        return _value_summary(dimensions, matches)
    if assessment_type == "ideology":
        return _ideology_summary(dimensions, matches)
    return "镜中人,就是你。"


def _celebrity_summary(dimensions: dict, matches: list[dict]) -> str:
    if not matches:
        return "你的人格组合太特殊,镜子里照不出任何已有的名字。"
    top = matches[0]
    dim_names = {
        "openness": "开放", "conscientiousness": "自律", "extraversion": "外向",
        "agreeableness": "温厚", "neuroticism": "敏感", "risk_taking": "冒险",
        "idealism": "理想主义",
    }
    if dimensions:
        top_dim = max(dimensions, key=lambda k: dimensions[k])
        dim_label = dim_names.get(top_dim, top_dim)
        return f"镜子里有{top['name']}的影子。{top['blurb']} 最显眼的是{dim_label}——{dimensions[top_dim]}分,其余特质都围着它转。"
    return f"镜子里有{top['name']}的影子。{top['blurb']}"


def _value_summary(dimensions: dict, matches: list[dict]) -> str:
    if not matches:
        return "你的价值结构太特殊,很难用一个标签概括。"
    tier = matches[0]["name"].split(":", 1)[-1] if ":" in matches[0]["name"] else matches[0]["name"]
    moral_score = matches[0].get("match_pct", 0)
    blurb = matches[0].get("blurb", "")
    if len(matches) > 1:
        vtype = matches[1]["name"].split(":", 1)[-1] if ":" in matches[1]["name"] else ""
        return f"你落在「{tier}」这一档,{('外加' + vtype + '的底色') if vtype else ''}道德直觉{moral_score}分。{blurb}"
    return f"你落在「{tier}」这一档,道德直觉{moral_score}分。{blurb}"


def _ideology_summary(dimensions: dict, matches: list[dict]) -> str:
    if not matches:
        return "你的政治坐标落在一片无人标记的空地。"
    top = matches[0]
    econ = 50 + (dimensions.get("econ_right", 50) - dimensions.get("econ_left", 50)) / 2
    social = 50 + (dimensions.get("authority", 50) - dimensions.get("liberty", 50)) / 2
    econ_label = "经济上偏左" if econ < 40 else "经济上偏右" if econ > 60 else "经济上居中"
    social_label = "社会议题偏自由" if social < 40 else "社会议题偏权威" if social > 60 else "社会议题居中"
    return f"你的坐标:{econ_label},{social_label}。最接近{top['name']}。{top['blurb']}"
