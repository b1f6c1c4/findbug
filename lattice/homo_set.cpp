#include "homo_set.hpp"

template<>
homo_set<true> &homo_set<true>::operator+=(const elem &el) {
    if (!(*this <= el)) {
        std::erase_if(_els, [&el](const elem &e) {
            return e >= el;
        });
        _els.push_back(el);
    }
    return *this;
}

template<>
homo_set<false> &homo_set<false>::operator+=(const elem &el) {
    if (!(*this >= el)) {
        std::erase_if(_els, [&el](const elem &e) {
            return e <= el;
        });
        _els.push_back(el);
    }
    return *this;
}
